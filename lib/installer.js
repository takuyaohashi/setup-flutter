"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load tempDirectory before it gets wiped by tool-cache
let tempDirectory = process.env['RUNNER_TEMPDIRECTORY'] || '';
const core = __importStar(require("@actions/core"));
const tc = __importStar(require("@actions/tool-cache"));
const restm = __importStar(require("typed-rest-client/RestClient"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const baseUrl = 'https://storage.googleapis.com/flutter_infra/releases';
if (!tempDirectory) {
    let baseLocation;
    if (process.platform === 'win32') {
        // On windows use the USERPROFILE env variable
        baseLocation = process.env['USERPROFILE'] || 'C:\\';
    }
    else {
        if (process.platform === 'darwin') {
            baseLocation = '/Users';
        }
        else {
            baseLocation = '/home';
        }
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp');
}
function getFlutter(version, channel) {
    return __awaiter(this, void 0, void 0, function* () {
        if (version === 'latest') {
            version = yield getLatestVersion(channel);
        }
        let toolPath = tc.find('flutter', version);
        if (toolPath) {
            core.debug(`Tool found in cache ${toolPath}`);
        }
        else {
            let sdkPath = yield acquireFlutter(version, channel);
            toolPath = yield tc.cacheDir(sdkPath, 'flutter', version);
        }
        let binPath = path.join(toolPath, 'bin');
        core.addPath(binPath);
    });
}
exports.getFlutter = getFlutter;
function acquireFlutter(version, channel) {
    return __awaiter(this, void 0, void 0, function* () {
        let filename = getFileName(version, channel);
        let downloadUrl = getFileUrl(filename, channel);
        let downloadPath = null;
        try {
            downloadPath = yield tc.downloadTool(downloadUrl);
        }
        catch (error) {
            core.debug(error);
            throw `Failed to download ${filename}: ${error}`;
        }
        let extPath = tempDirectory;
        if (!extPath) {
            throw new Error('Temp directory not set');
        }
        if (process.platform == 'linux') {
            extPath = yield tc.extractTar(downloadPath, undefined, 'x');
        }
        else {
            extPath = yield tc.extractZip(downloadPath, undefined);
        }
        return path.join(extPath, 'flutter');
    });
}
function getPlatformName() {
    switch (os.platform()) {
        case 'darwin': {
            return 'macos';
        }
        case 'win32': {
            return 'windows';
        }
        default: {
            return 'linux';
        }
    }
}
function getFileName(version, channel) {
    const platform = getPlatformName();
    const ext = platform == 'linux' ? 'tar.xz' : 'zip';
    const filename = util.format('flutter_%s_%s-%s.%s', platform, version, channel, ext);
    return filename;
}
function getFileUrl(filename, channel) {
    const platform = getPlatformName();
    return util.format('%s/%s/%s/%s', baseUrl, channel, platform, filename);
}
function getLatestVersion(channel) {
    return __awaiter(this, void 0, void 0, function* () {
        const platform = getPlatformName();
        let releasesUrl = util.format('%s/releases_%s.json', baseUrl, platform);
        console.log(releasesUrl);
        const rest = new restm.RestClient('setup-flutter');
        const ref = (yield rest.get(releasesUrl)).result;
        if (!ref) {
            throw new Error('unable to get flutter release ref');
        }
        const channelVersion = ref.releases.find(release => release.hash === ref.current_release[channel]);
        if (!channelVersion) {
            throw new Error(`unable to get latest version from channel ${channel}`);
        }
        return channelVersion.version;
    });
}
