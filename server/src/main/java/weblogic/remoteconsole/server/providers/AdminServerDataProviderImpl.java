// Copyright (c) 2020, 2021, Oracle Corporation and/or its affiliates.
// Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.

package weblogic.remoteconsole.server.providers;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import javax.json.Json;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;

import weblogic.remoteconsole.common.utils.StringUtils;
import weblogic.remoteconsole.common.utils.WebLogicMBeansVersion;
import weblogic.remoteconsole.common.utils.WebLogicRoles;
import weblogic.remoteconsole.server.ConsoleBackendRuntime;
import weblogic.remoteconsole.server.ConsoleBackendRuntimeConfig;
import weblogic.remoteconsole.server.connection.Connection;
import weblogic.remoteconsole.server.connection.ConnectionManager;
import weblogic.remoteconsole.server.repo.InvocationContext;
import weblogic.remoteconsole.server.repo.weblogic.WebLogicRestDomainRuntimePageRepo;
import weblogic.remoteconsole.server.repo.weblogic.WebLogicRestEditPageRepo;
import weblogic.remoteconsole.server.repo.weblogic.WebLogicRestServerConfigPageRepo;
import weblogic.remoteconsole.server.webapp.FailedRequestException;
import weblogic.remoteconsole.server.webapp.ProviderResource;
import weblogic.remoteconsole.server.webapp.UriUtils;

/**
 * The implementation of the provider for Admin Server connections.  It relies
 * on the ConnectionManager class to do most of its work.
*/
public class AdminServerDataProviderImpl implements AdminServerDataProvider {
  public static final String TYPE_NAME = "AdminServerConnection";
  private static final ConnectionManager cm = ConsoleBackendRuntime.INSTANCE.getConnectionManager();
  private String connectionId;
  private String name;
  private String url;
  private String authorizationHeader;
  private WebLogicMBeansVersion mbeansVersion;
  private String connectionWarning;
  private String lastMessage;
  private static final long connectTimeout =
    ConsoleBackendRuntimeConfig.getConnectionTimeout();
  private static final long readTimeout =
    ConsoleBackendRuntimeConfig.getReadTimeout();
  private static final boolean isDisableHostnameVerification =
    ConsoleBackendRuntimeConfig.isHostnameVerificationDisabled();
  private boolean isLastConnectionAttemptSuccessful;
  private boolean isAnyConnectionAttemptSuccessful;
  private Map<String, Root> roots = new HashMap<String, Root>();
  private Root editRoot;
  private Root viewRoot;
  private Root monitoringRoot;

  public AdminServerDataProviderImpl(
    String name,
    String url,
    String authorizationHeader
  ) {
    this.name = name;
    this.url = url;
    this.authorizationHeader = authorizationHeader;
    String encodedName = StringUtils.urlEncode(name);
    editRoot = new Root(
      Root.EDIT_NAME,
      Root.CONFIGURATION_ROOT,
      Root.EDIT_LABEL,
      "/" + UriUtils.API_URI + "/" + encodedName + "/" + Root.EDIT_NAME + "/navtree",
      "/" + UriUtils.API_URI + "/" + encodedName + "/" + Root.EDIT_NAME + "/changeManager",
      false // it is not read only
    );
    viewRoot = new Root(
      Root.SERVER_CONFIGURATION_NAME,
      Root.CONFIGURATION_ROOT,
      Root.CONFIGURATION_LABEL,
      "/" + UriUtils.API_URI + "/" + encodedName + "/" + Root.SERVER_CONFIGURATION_NAME + "/navtree",
      null, // no change manager
      true  // it is read only
    );
    monitoringRoot = new Root(
      Root.DOMAIN_RUNTIME_NAME,
      Root.MONITORING_ROOT,
      Root.MONITORING_LABEL,
      "/" + UriUtils.API_URI + "/" + encodedName + "/" + Root.DOMAIN_RUNTIME_NAME + "/navtree",
      null, // no change manager
      true  // it is read only
    );
  }

  @Override
  public String getType() {
    return TYPE_NAME;
  }

  @Override
  public String getURL() {
    return url;
  }

  @Override
  public String getAuthorizationHeader() {
    return authorizationHeader;
  }

  @Override
  public long getConnectTimeout() {
    return connectTimeout;
  }

  @Override
  public long getReadTimeout() {
    return readTimeout;
  }

  @Override
  public boolean isDisableHostnameVerification() {
    return isDisableHostnameVerification;
  }

  @Override
  public String getName() {
    return name;
  }

  @Override
  public boolean isLastConnectionAttemptSuccessful() {
    return isLastConnectionAttemptSuccessful;
  }

  @Override
  public boolean isAnyConnectionAttemptSuccessful() {
    return isAnyConnectionAttemptSuccessful;
  }

  @Override
  public void test(InvocationContext ic) {
    start(ic);
  }

  @Override
  public synchronized boolean start(InvocationContext ic) {
    ic.setProvider(this);
    Connection connection = null;
    if (connectionId == null) {
      ConnectionManager.ConnectionResponse result =
        cm.tryConnection(url, authorizationHeader, ic.getLocales());
      if (result.isSuccess()) {
        isLastConnectionAttemptSuccessful = true;
        isAnyConnectionAttemptSuccessful = true;
        connectionId = result.getConnectionId();
        connection = cm.getConnection(connectionId);
        mbeansVersion = cm.getWebLogicMBeansVersion(connection);
        editRoot.setPageRepo(new WebLogicRestEditPageRepo(mbeansVersion));
        viewRoot.setPageRepo(new WebLogicRestServerConfigPageRepo(mbeansVersion));
        monitoringRoot.setPageRepo(new WebLogicRestDomainRuntimePageRepo(mbeansVersion));
        roots.clear();
        roots.put(viewRoot.getName(), viewRoot);
        roots.put(monitoringRoot.getName(), monitoringRoot);
        Set<String> roles = mbeansVersion.getRoles();
        if (roles.contains(WebLogicRoles.ADMIN) || roles.contains(WebLogicRoles.DEPLOYER)) {
          // Admins and deployers are allowed to edit the configuration
          roots.put(editRoot.getName(), editRoot);
        } else {
          // Other users are not allowed to edit the configuration
        }
        lastMessage = null;
      } else {
        isLastConnectionAttemptSuccessful = false;
        lastMessage = result.getMessage();
        ic.setConnection(null);
        throw new FailedRequestException(
          result.getStatus().getStatusCode(), toJSON(ic));
      }
    } else {
      connection = cm.getConnection(connectionId);
    }
    ic.setConnection(connection);
    return true;
  }

  @Override
  public void terminate() {
    if (connectionId != null) {
      cm.removeConnection(connectionId);
      connectionId = null;
    }
  }

  @Override
  public Map<String, Root> getRoots() {
    return roots;
  }

  @Override
  public JsonObject toJSON(InvocationContext ic) {
    JsonObjectBuilder ret = Json.createObjectBuilder();
    ret.add("name", getName());
    ret.add(ProviderResource.PROVIDER_TYPE, getType());
    ret.add(ProviderResource.DOMAIN_URL, getURL());
    ret.add("connectTimeout", getConnectTimeout());
    ret.add("readTimeout", getReadTimeout());
    ret.add("mode", "standalone");
    ret.add("anyConnectionAttemptSuccessful", isAnyConnectionAttemptSuccessful());
    ret.add("lastConnectionAttemptSuccessful", isLastConnectionAttemptSuccessful());
    Connection connection = null;
    if (isLastConnectionAttemptSuccessful()) {
      ret.add("state", "connected");
      connection = cm.getConnection(connectionId);
      ret.add("domainVersion", connection.getDomainVersion());
      ret.add("domainName", connection.getDomainName());
      if (connectionWarning != null) {
        ret.add("connectionWarning", connectionWarning);
      }
    } else {
      ret.add("state", "disconnected");
      if (lastMessage != null) {
        ret.add("messages", createMessages(lastMessage));
      }
    }
    {
      JsonArrayBuilder builder = Json.createArrayBuilder();
      if (connection != null) {
        // We've successfully connected to the wls domain. Send back the roots.
        for (Root root : getRoots().values()) {
          builder.add(root.toJSON(ic));
        }
      }
      ret.add("roots", builder);
    }
    {
      JsonArrayBuilder builder = Json.createArrayBuilder();
      if (mbeansVersion != null) {
        // We've know the user's roles.  Send them back.
        for (String role : mbeansVersion.getRoles()) {
          builder.add(role);
        }
      }
      ret.add("roles", builder);
    }
    return ret.build();
  }

  @Override
  public boolean isValidPath(String path) {
    return true;
  }
}
