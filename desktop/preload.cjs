"use strict";

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("playMasterDesktop", Object.freeze({
  isDesktop: true,
  platform: process.platform,
  appName: "PlayMaster Air"
}));
