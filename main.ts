import fetch from "node-fetch";
import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFolder,
} from "obsidian";
import { shim } from "string.prototype.matchall";

shim();

const mdImageRegex =
  /!\[[^\]]*\]\((?<filename>.*?)(?=\"|\))(?<optionalpart>\".*\")?\)/g;

interface MyPluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: "default",
};

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    console.log("loading plugin");

    await this.loadSettings();

    this.addRibbonIcon("dice", "Sample Plugin", () => {
      new Notice("This is a notice!");
    });

    this.addStatusBarItem().setText("Status Bar Text");

    this.addCommand({
      id: "download-images",
      name: "Download images locally",
      callback: async () => {
        await this.run();
      },
    });

    this.addSettingTab(new SampleSettingTab(this.app, this));

    this.registerInterval(
      window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
    );
  }

  onunload() {
    console.log("unloading plugin");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private async run() {
    const files = this.app.vault.getFiles();

    for (const file of files) {
      const fileContent = await this.app.vault.read(file);
      // @ts-expect-error This uses the shim for matchall
      const matches = fileContent.matchAll(mdImageRegex);
      const filePath = this.app.fileManager.getNewFileParent(file.path);
      const imgFolderPath = `${filePath.path}/img`;
      try {
        await this.app.vault.createFolder(imgFolderPath);
      } catch (error) {
        if (!error.message.contains("Folder already exists")) {
          throw error;
        }
      }

      for (const match of matches) {
        await this.downloadAndSaveFile(match.groups.filename, imgFolderPath);
      }
    }
  }

  private async replaceInText(content: string) {
    //content.replace('aa', 'bb')
  }

  private async downloadAndSaveFile(url: string, outputPath: string) {
    const imageRes = await fetch(url);
    const imageData = await imageRes.arrayBuffer();

    // File names cannot contain / or \
    // So we try to get the image name from the last part of the url
    const fileName = url.split("/").last().split("\\").last();

    try {
      await this.app.vault.createBinary(`${outputPath}/${fileName}`, imageData);
    } catch (error) {
      if (!error.message.contains("File already exists")) {
        throw error;
      }
    }
  }
}

class SampleModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.setText("Woah!");
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}

class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Local images" });

    new Setting(containerEl)
      .setName("Setting #1")
      .setDesc("It's a secret")
      .addText((text) =>
        text
          .setPlaceholder("Enter your secret")
          .setValue("")
          .onChange(async (value) => {
            console.log("Secret: " + value);
            this.plugin.settings.mySetting = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
