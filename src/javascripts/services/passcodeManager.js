import _ from 'lodash';
import { isDesktopApplication } from '@/utils';
import { StorageManager } from './storageManager';
import { protocolManager } from 'snjs';

const MillisecondsPerSecond = 1000;

export class PasscodeManager {
  /* @ngInject */
  constructor($rootScope, authManager, storageManager, syncManager) {
    this.authManager = authManager;
    this.storageManager = storageManager;
    this.syncManager = syncManager;
    this.$rootScope = $rootScope;

    this._hasPasscode = this.storageManager.getItemSync("offlineParams", StorageManager.Fixed) != null;
    this._locked = this._hasPasscode;

    this.visibilityObservers = [];
    this.passcodeChangeObservers = [];

    this.configureAutoLock();
  }

  addPasscodeChangeObserver(callback) {
    this.passcodeChangeObservers.push(callback);
  }

  lockApplication() {
    window.location.reload();
    this.cancelAutoLockTimer();
  }

  isLocked() {
    return this._locked;
  }

  hasPasscode() {
    return this._hasPasscode;
  }

  keys() {
    return this._keys;
  }

  addVisibilityObserver(callback) {
    this.visibilityObservers.push(callback);
    return callback;
  }

  removeVisibilityObserver(callback) {
    _.pull(this.visibilityObservers, callback);
  }

  notifiyVisibilityObservers(visible) {
    for(const callback of this.visibilityObservers)  {
      callback(visible);
    }
  }

  async setAutoLockInterval(interval) {
    return this.storageManager.setItem(PasscodeManager.AutoLockIntervalKey, JSON.stringify(interval), StorageManager.FixedEncrypted);
  }

  async getAutoLockInterval() {
    const interval = await this.storageManager.getItem(PasscodeManager.AutoLockIntervalKey, StorageManager.FixedEncrypted);
    if(interval) {
      return JSON.parse(interval);
    } else {
      return PasscodeManager.AutoLockIntervalNone;
    }
  }

  passcodeAuthParams() {
    var authParams = JSON.parse(this.storageManager.getItemSync("offlineParams", StorageManager.Fixed));
    if(authParams && !authParams.version) {
      var keys = this.keys();
      if(keys && keys.ak) {
        // If there's no version stored, and there's an ak, it has to be 002. Newer versions would have their version stored in authParams.
        authParams.version = "002";
      } else {
        authParams.version = "001";
      }
    }
    return authParams;
  }

  async verifyPasscode(passcode) {
    return new Promise(async (resolve, reject) => {
      var params = this.passcodeAuthParams();
      const keys = await protocolManager.computeEncryptionKeysForUser(passcode, params);
      if(keys.pw !== params.hash) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  }

  unlock(passcode, callback) {
    var params = this.passcodeAuthParams();
    protocolManager.computeEncryptionKeysForUser(passcode, params).then((keys) => {
      if(keys.pw !== params.hash) {
        callback(false);
        return;
      }

      this._keys = keys;
      this._authParams = params;
      this.decryptLocalStorage(keys, params).then(() => {
        this._locked = false;
        callback(true);
      });
    });
  }

  setPasscode(passcode, callback) {
    var uuid = protocolManager.crypto.generateUUIDSync();

    protocolManager.generateInitialKeysAndAuthParamsForUser(uuid, passcode).then((results) => {
      const keys = results.keys;
      const authParams = results.authParams;

      authParams.hash = keys.pw;
      this._keys = keys;
      this._hasPasscode = true;
      this._authParams = authParams;

      // Encrypting will initially clear localStorage
      this.encryptLocalStorage(keys, authParams);

      // After it's cleared, it's safe to write to it
      this.storageManager.setItem("offlineParams", JSON.stringify(authParams), StorageManager.Fixed);
      callback(true);

      this.notifyObserversOfPasscodeChange();
    });
  }

  changePasscode(newPasscode, callback) {
    this.setPasscode(newPasscode, callback);
  }

  clearPasscode() {
    this.storageManager.setItemsMode(this.authManager.isEphemeralSession() ? StorageManager.Ephemeral : StorageManager.Fixed); // Transfer from Ephemeral
    this.storageManager.removeItem("offlineParams", StorageManager.Fixed);
    this._keys = null;
    this._hasPasscode = false;

    this.notifyObserversOfPasscodeChange();
  }

  notifyObserversOfPasscodeChange() {
    for(var observer of this.passcodeChangeObservers) {
      observer();
    }
  }

  encryptLocalStorage(keys, authParams) {
    this.storageManager.setKeys(keys, authParams);
    // Switch to Ephemeral storage, wiping Fixed storage
    // Last argument is `force`, which we set to true because in the case of changing passcode
    this.storageManager.setItemsMode(this.authManager.isEphemeralSession() ? StorageManager.Ephemeral : StorageManager.FixedEncrypted, true);
  }

  async decryptLocalStorage(keys, authParams) {
    this.storageManager.setKeys(keys, authParams);
    return this.storageManager.decryptStorage();
  }

  configureAutoLock() {
    PasscodeManager.AutoLockPollFocusInterval = 1 * MillisecondsPerSecond;

    PasscodeManager.AutoLockIntervalNone = 0;
    PasscodeManager.AutoLockIntervalImmediate = 1;
    PasscodeManager.AutoLockIntervalOneMinute = 60 * MillisecondsPerSecond;
    PasscodeManager.AutoLockIntervalFiveMinutes = 300 * MillisecondsPerSecond;
    PasscodeManager.AutoLockIntervalOneHour = 3600 * MillisecondsPerSecond;

    PasscodeManager.AutoLockIntervalKey = "AutoLockIntervalKey";

    if(isDesktopApplication()) {
      // desktop only
      this.$rootScope.$on("window-lost-focus", () => {
        this.documentVisibilityChanged(false);
      });
      this.$rootScope.$on("window-gained-focus", () => {
        this.documentVisibilityChanged(true);
      });
    } else {
      // tab visibility listener, web only
      document.addEventListener('visibilitychange', (e) => {
        const visible = document.visibilityState === "visible";
        this.documentVisibilityChanged(visible);
      });

      // verify document is in focus every so often as visibilitychange event is not triggered
      // on a typical window blur event but rather on tab changes
      this.pollFocusTimeout = setInterval(() => {
        const hasFocus = document.hasFocus();

        if(hasFocus && this.lastFocusState === "hidden") {
          this.documentVisibilityChanged(true);
        } else if(!hasFocus && this.lastFocusState === "visible") {
          this.documentVisibilityChanged(false);
        }

        // save this to compare against next time around
        this.lastFocusState = hasFocus ? "visible" : "hidden";
      }, PasscodeManager.AutoLockPollFocusInterval);
    }
  }

  getAutoLockIntervalOptions() {
    return [
      {
        value: PasscodeManager.AutoLockIntervalNone,
        label: "Off"
      },
      {
        value: PasscodeManager.AutoLockIntervalImmediate,
        label: "Immediately"
      },
      {
        value: PasscodeManager.AutoLockIntervalOneMinute,
        label: "1m"
      },
      {
        value: PasscodeManager.AutoLockIntervalFiveMinutes,
        label: "5m"
      },
      {
        value: PasscodeManager.AutoLockIntervalOneHour,
        label: "1h"
      }
    ];
  }

  documentVisibilityChanged(visible) {
    if(visible) {
      // check to see if lockAfterDate is not null, and if the application isn't locked.
      // if that's the case, it needs to be locked immediately.
      if(this.lockAfterDate && new Date() > this.lockAfterDate && !this.isLocked()) {
        this.lockApplication();
      } else {
        if(!this.isLocked()) {
          this.syncManager.sync();
        }
      }
      this.cancelAutoLockTimer();
    } else {
      this.beginAutoLockTimer();
    }

    this.notifiyVisibilityObservers(visible);
  }

  async beginAutoLockTimer() {
    var interval = await this.getAutoLockInterval();
    if(interval == PasscodeManager.AutoLockIntervalNone) {
      return;
    }

    // Use a timeout if possible, but if the computer is put to sleep, timeouts won't work.
    // Need to set a date as backup. this.lockAfterDate does not need to be persisted, as
    // living in memory seems sufficient. If memory is cleared, then the application will lock anyway.
    const addToNow = (seconds) => {
      const date = new Date();
      date.setSeconds(date.getSeconds() + seconds);
      return date;
    };

    this.lockAfterDate = addToNow(interval / MillisecondsPerSecond);
    this.lockTimeout = setTimeout(() => {
      this.lockApplication();
      // We don't need to look at this anymore since we've succeeded with timeout lock
      this.lockAfterDate = null;
    }, interval);
  }

  cancelAutoLockTimer() {
    clearTimeout(this.lockTimeout);
    this.lockAfterDate = null;
  }
}
