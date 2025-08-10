// launcher/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');
const os = require('os');

const LAUNCHER_NAME = "CraftiumClient";
const VERSION = "1.0.0";
const MC_VERSION = "1.21.4";
const FABRIC_LOADER_VERSION = "0.15.10";
const BASE_DIR = __dirname;
const MINECRAFT_DIR = path.join(os.homedir(), '.craftiumclient');
const GAME_DIR = path.join(MINECRAFT_DIR, 'game');
const MODS_DIR = path.join(GAME_DIR, 'mods');
const CONFIG_PATH = path.join(MINECRAFT_DIR, 'config.json');
    const FABRIC_INSTALLER_URL = `https://meta.fabricmc.net/v2/versions/loader/${MC_VERSION}/${FABRIC_LOADER_VERSION}/0.11.2/client/jar
import { getAuth, signInWithPopup, OAuthProvider } from "firebase/auth";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export async function loginWithMicrosoft() {
  const provider = new OAuthProvider('microsoft.com');
  provider.setCustomParameters({
    prompt: 'consent',
    tenant: 'consumers'
  });

  const result = await signInWithPopup(auth, provider);
  
  // Microsoft access token (needed for Xbox Live auth)
  const accessToken = result.credential.accessToken;
  const refreshToken = result.user.stsTokenManager.refreshToken;

  return { accessToken, refreshToken, user: result.user };
}


// Microsoft mock auth
function authenticateMicrosoft() {
    console.log("Authenticating with Microsoft (mock)...");
    return { access_token: "mock_token", uuid: "player_uuid", name: "Player" };
}

// Real Fabric installer logic
async function setupMinecraft() {
    fs.mkdirSync(MODS_DIR, { recursive: true });
    console.log(`Setting up Minecraft ${MC_VERSION} with Fabric ${FABRIC_LOADER_VERSION}...`);

    const fabricInstallerPath = path.join(GAME_DIR, 'fabric-installer.jar');

    if (!fs.existsSync(fabricInstallerPath)) {
        console.log("Downloading Fabric installer...");
        await downloadFile(FABRIC_INSTALLER_URL, fabricInstallerPath);
    }

    console.log("Installing Fabric...");
    await runJava(["-jar", fabricInstallerPath, "server", "-mcversion", MC_VERSION, "-loader", FABRIC_LOADER_VERSION, "-dir", GAME_DIR]);
}

// Generic file downloader
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, response => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', reject);
    });
}

// Runs Java commands
function runJava(args) {
    return new Promise((resolve, reject) => {
        const java = spawn("java", args, { cwd: GAME_DIR, stdio: "inherit" });
        java.on('close', code => code === 0 ? resolve() : reject(new Error(`Java exited with code ${code}`)));
    });
}

// Download mods sequentially
async function downloadMods() {
    const mods = [
        { name: "CraftiumCore", url: "https://example.com/mods/CraftiumCore.jar" },
        { name: "Emotes", url: "https://example.com/mods/Emotes.jar" },
        { name: "Pets", url: "https://example.com/mods/Pets.jar" },
        { name: "Capes", url: "https://example.com/mods/Capes.jar" },
        { name: "Cosmetics", url: "https://example.com/mods/Cosmetics.jar" },
        { name: "FirebaseAuth", url: "https://example.com/mods/FirebaseAuth.jar" },
        { name: "PromoCodes", url: "https://example.com/mods/PromoCodes.jar" }
    ];
    for (const mod of mods) {
        const filePath = path.join(MODS_DIR, `${mod.name}.jar`);
        console.log(`Downloading ${mod.name}...`);
        await downloadFile(mod.url, filePath);
    }
}

// Save config
function saveConfig() {
    fs.mkdirSync(MINECRAFT_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ version: VERSION }, null, 2));
}

// Launch Minecraft
function launchGame(auth) {
    console.log(`Launching Minecraft as ${auth.name}...`);
    const jarPath = path.join(GAME_DIR, 'fabric-server-launch.jar');
    const args = [
        '-Xmx2G', '-Xms1G',
        '-jar', jarPath,
        'nogui'
    ];
    const mc = spawn("java", args, { cwd: GAME_DIR, stdio: "inherit" });
    mc.on('close', code => console.log(`Minecraft exited with code ${code}`));
}

// Electron window
function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        title: `${LAUNCHER_NAME} v${VERSION}`
    });
    win.loadFile('index.html');

    ipcMain.on('redeem-code', (event, code) => {
        console.log(`Redeeming promo code: ${code}`);
        event.reply('code-result', { success: true, reward: "100 Minecoins" });
    });

    ipcMain.on('get-status', (event) => {
        event.returnValue = {
            authenticated: true,
            user: {
                name: "Player",
                uuid: "player_uuid"
            },
            version: VERSION
        };
    });
}

app.whenReady().then(async () => {
    console.log(`=== ${LAUNCHER_NAME} Launcher v${VERSION} ===`);
    const auth = authenticateMicrosoft();
    await setupMinecraft();
    await downloadMods();
    saveConfig();
    launchGame(auth);
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});