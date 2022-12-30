const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');
const fs = require('fs');
const moment = require('moment');

const createDirectoryIfNotExists = dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

class DallERunner {
  prompts
  apiKey
  configuration
  openai
  folder
  isDebug

  constructor({apiKey, prompts, folder = '.', isDebug = false}) {
    this.arePromptsValid(prompts);
    createDirectoryIfNotExists(folder);
    this.prompts = prompts;
    this.apiKey = apiKey;
    this.configuration = new Configuration({apiKey});
    this.openai = new OpenAIApi(this.configuration);
    this.folder = folder;
    this.isDebug = isDebug;
  }

  arePromptsValid = (prompts) => {
    if (!Array.isArray(prompts)) {
      throw new Error('Prompts must be an array');
    }
    prompts.forEach(item => {
      if (typeof item !== 'string') {
        throw new Error('Prompts must be an array of strings');
      }
    })
    return true;
  }

  isSizeValid = (size) => {
    if (size === 's' || size === 'm' || size === 'l') {
      return true;
    }
    throw new Error('Size not valid, available values: s, m, l');
  }

  getRandomPrompt = () => {
    const randomIndex = Math.floor(Math.random() * this.prompts.length);
    return this.prompts[randomIndex];
  }

  /*
   * size = 's' || 'm' || 'l';
   * n = number >= 1 && <= 10;
   */
  generate = async ({size = 's', n = 1}) => {
    this.isSizeValid(size);
    const sizeMap = {
      's': '256x256',
      'm': '512x512',
      'l': '1024x1024'
    }
    const prompt = this.getRandomPrompt();
    console.log('Dall-E script: sending request to OpenAI service');
    const res = await this.openai.createImage({
      prompt,
      n,
      size: sizeMap[size],
    });
    console.log('Dall-E script: request to OpenAI service successful');
    return {
      prompt,
      files: res.data?.data?.map(item => item.url)
    }
  }

  downloadAndSave = async (files) => {
    const savedFiles = [];
    const promises = [];
    const runCycle = async (url, prefix) => {
      try {
        const res = await axios(url, {
          responseType: 'arraybuffer'
        });
        const buffer = Buffer.from(res.data, 'binary');
        const now = moment().format('YYYY-MM-DD_HH:mm:ss');
        const filename = `${this.folder}/${now}__${prefix + 1}.png`;
        try {
          fs.writeFileSync(filename, buffer);
          savedFiles.push(filename);
        } catch (err) {
          if (this.isDebug) {
            console.log(err);
          }
          console.log('Save file error');
        }
      } catch (e) {
        if (this.isDebug) {
          console.log(e);
        }
        console.log('Download file error');
      }
    }

    console.log('Dall-E script: saving files');
    files.forEach((url, i) => {
      promises.push(runCycle(url, i));
    })
    await Promise.all(promises);
    console.log('Dall-E script: files saved successfully');
    return savedFiles;
  }

  run = async ({size = 's', n = 1}) => {
    console.log('Dall-E script: started');
    const result = await this.generate({size, n});
    const savedFiles = await this.downloadAndSave(result.files);
    console.log('Dall-E script: finished');
    return {
      prompt: result.prompt,
      savedFiles
    }
  }
}

module.exports = DallERunner;
