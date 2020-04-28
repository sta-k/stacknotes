import angular from 'angular';
import { StorageManager } from './storageManager';
import { protocolManager, SFAuthManager } from 'snjs';

export class AuthManager extends SFAuthManager {
  /* @ngInject */
  constructor(
    modelManager,
    singletonManager,
    storageManager,
    dbManager,
    httpManager,
    $rootScope,
    $timeout,
    $compile
  ) {
    super(storageManager, httpManager, null, $timeout);
    this.$rootScope = $rootScope;
    this.$compile = $compile;
    this.modelManager = modelManager;
    this.singletonManager = singletonManager;
    this.storageManager = storageManager;
    this.dbManager = dbManager;
  }

  loadInitialData() {
    const userData = this.storageManager.getItemSync("user");
    if(userData) {
      this.user = JSON.parse(userData);
    } else {
      // legacy, check for uuid
      const idData = this.storageManager.getItemSync("uuid");
      if(idData) {
        this.user = {uuid: idData};
      }
    }
    this.checkForSecurityUpdate();
  }

  offline() {
    return !this.user;
  }

  isEphemeralSession() {
    if(this.ephemeral == null || this.ephemeral == undefined) {
      this.ephemeral = JSON.parse(this.storageManager.getItemSync("ephemeral", StorageManager.Fixed));
    }
    return this.ephemeral;
  }

  setEphemeral(ephemeral) {
    this.ephemeral = ephemeral;
    if(ephemeral) {
      this.storageManager.setModelStorageMode(StorageManager.Ephemeral);
      this.storageManager.setItemsMode(StorageManager.Ephemeral);
    } else {
      this.storageManager.setModelStorageMode(StorageManager.Fixed);
      this.storageManager.setItemsMode(this.storageManager.bestStorageMode());
      this.storageManager.setItem("ephemeral", JSON.stringify(false), StorageManager.Fixed);
    }
  }

  async getAuthParamsForEmail(url, email, extraParams) {
    return super.getAuthParamsForEmail(url, email, extraParams);
  }

  async login(url, email, password, ephemeral, strictSignin, extraParams) {
    return super.login(url, email, password, strictSignin, extraParams).then((response) => {
      if(!response.error) {
        this.setEphemeral(ephemeral);
        this.checkForSecurityUpdate();
      }

      return response;
    });
  }

  async register(url, email, password, ephemeral) {
    return super.register(url, email, password).then((response) => {
      if(!response.error) {
        this.setEphemeral(ephemeral);
      }
      return response;
    });
  }

  async changePassword(url, email, current_server_pw, newKeys, newAuthParams) {
    return super.changePassword(url, email, current_server_pw, newKeys, newAuthParams).then((response) => {
      if(!response.error) {
        this.checkForSecurityUpdate();
      }
      return response;
    });
  }

  async handleAuthResponse(response, email, url, authParams, keys) {
    try {
      await super.handleAuthResponse(response, email, url, authParams, keys);
      this.user = response.user;
      this.storageManager.setItem("user", JSON.stringify(response.user));
    } catch (e) {
      this.dbManager.displayOfflineAlert();
    }
  }

  async verifyAccountPassword(password) {
    const authParams = await this.getAuthParams();
    const keys = await protocolManager.computeEncryptionKeysForUser(password, authParams);
    const success = keys.mk === (await this.keys()).mk;
    return success;
  }

  async checkForSecurityUpdate() {
    if(this.offline()) {
      return false;
    }

    const latest = protocolManager.version();
    const updateAvailable = await this.protocolVersion() !== latest;
    if(updateAvailable !== this.securityUpdateAvailable) {
      this.securityUpdateAvailable = updateAvailable;
      this.$rootScope.$broadcast("security-update-status-changed");
    }

    return this.securityUpdateAvailable;
  }

  presentPasswordWizard(type) {
    var scope = this.$rootScope.$new(true);
    scope.type = type;
    var el = this.$compile( "<password-wizard type='type'></password-wizard>" )(scope);
    angular.element(document.body).append(el);
  }

  signOut() {
    super.signout();
    this.user = null;
    this._authParams = null;
  }
}
