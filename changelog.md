# Changelog for Weavy

## Weavy 2.0

Weavy 2.0 introduces the Weavy SDK, allowing developers to extend Weavy with additional 
functionality. See https://docs.weavy.com for more information.

### 2.0.0 (2018-11-06)

### Upgrade instructions

There is no automated upgrade process for upgrading from Weavy 1.x to 2.x. If you need to migrate
an existing 1.x installation to 2.x you should contact support@weavy.com for instructions.

## Weavy 1.1

With Weavy 1.1 it is possible to add files from cloud file providers such as Google Drive, OneDrive, 
Dropbox and Box. You can also create new Google drive documents directly from Weavy, without leaving
the context that you are working in.

Weavy 1.1 also gives you more possibilities when connecting a space bubble to a web page url. You
can choose between the domain (as in Weavy 1.0) or a specific path.

When writing posts, comments and chat messages, we have added the possibility to attach contextual 
links. This gives the reader of the post, comment or message a link to where it was created.

### 1.1.0 (2018-08-03)

* Cloud file picker - Add links to files from Google Drive, OneDrive, Dropbox and Box.
* Added more options how to connect a specific bubble to an url.
* Added possibility to add the current url as a context to posts, comments and messages.
* Introduced a new collapsed mode for the widget bubbles.
* Fixed widget layout issues in IE.
* Fixed an issue in the setup wizard not storing the submitted details correctly.

### Upgrade instructions

1. Perform a full backup of your Weavy database and the files in your Weavy web site before applying the upgrade.
2. Verify that your server meets the [system requirements](http://docs.weavy.com/installation/on-prem#system-requirements).
3. Download and unzip the [upgrade package](http://files.weavy.com/releases/weavy-latest.zip).
4. Update the `web.config` file in the upgrade package with your custom settings, e.g. [database connection string](http://docs.weavy.com/developers/connection-string) and [authentication settings](http://docs.weavy.com/manual/manage/authentication-settings).
5. Delete all files and folders from your site except `App_Data`.
6. Copy all files from `wwwroot` in the upgrade package into the root folder of your site.
7. Run the `weavy.exe` command line tool to update the database. The `weavy.exe` program is located in the `bin` directory of your Weavy installation.

## Weavy 1.0

Initial release of Weavy.

### 1.0.1 (2018-05-15)

* Fixed an issue that prevented infinite scroll from working.
* Fixed an issue where the weavy widget ui was incorrectly scaled in IE/Edge.
* Fixed an issue that prevented scroll from working on high-dpi screens in Chrome.

### 1.0.0 (2018-05-02)
