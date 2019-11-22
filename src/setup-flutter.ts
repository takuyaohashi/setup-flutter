import * as core from '@actions/core';
import {getFlutter} from './installer'

async function run() {
  try {
    let version = core.getInput('version');
    if (!version) {
      version = core.getInput('flutter-version', {required: true});
    }

    await getFlutter();
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
