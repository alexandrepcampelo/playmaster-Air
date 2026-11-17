"use strict";

const { app, BrowserWindow, protocol, session, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      allowServiceWorkers: true
    }
  }
]);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg"
};

function getAppRoot() {
  return app.getAppPath();
}

function resolveAppFile(requestUrl) {
  const url = new URL(requestUrl);
  const pathname = decodeURIComponent(url.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const root = path.resolve(getAppRoot());
  const target = path.resolve(root, relativePath);

  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error("Caminho inválido");
  }

  return target;
}

async function registerAppProtocol() {
  await protocol.handle("app", async (request) => {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return new Response(
        JSON.stringify({
          error: "A conexão com o servidor do PlayMaster Air ainda não foi configurada nesta versão desktop."
        }),
        {
          status: 503,
          headers: { "content-type": "application/json; charset=utf-8" }
        }
      );
    }

    try {
      const filePath = resolveAppFile(request.url);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return new Response("Não encontrado", { status: 404 });
      }

      const data = await fs.promises.readFile(filePath);
      const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
      return new Response(data, {
        headers: {
          "content-type": contentType,
          "x-content-type-options": "nosniff"
        }
      });
    } catch {
      return new Response("Recurso indisponível", { status: 400 });
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#061321",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("mailto:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, navigationUrl) => {
    if (!navigationUrl.startsWith("app://playmaster-air/")) {
      event.preventDefault();
    }
  });

  win.loadURL("app://playmaster-air/");
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    const mediaTypes = details?.mediaTypes || [];
    callback(permission === "media" && mediaTypes.includes("audio") && !mediaTypes.includes("video"));
  });

  await registerAppProtocol();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
