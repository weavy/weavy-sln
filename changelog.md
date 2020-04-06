# Changelog for Weavy

## 6.2.0 (2020-04-06)

* Added setting for disabling forms authentication.
* Added support for validating JWT with RS256, RS384 and RS512.
* Added support for JWT without email claim.
* Fixed some issues with the Note editor.
* Single Sign-On when opening webdav (MS Office) links from within Weavy.

## 6.1.4 (2020-03-27)

* Fixed some issues when signing in when in embedded mode.
* Updated tinyMCE to latest version (v5.2.0).
* Experimental html enabled text editor in post and comments. Enable by adding weavy.html-posts = true and weavy.html-comments = true to your app settings.

## 6.1.3 (2020-03-25)

* Added warning if client and server have different versions.
* Added before:navigate event.
* Fixed "anti forgery cookie is not present" error.
* Corrected click API endpoint url.

## 6.1.2 (2020-03-20)

* Realtime connection improvements.
* Fixed bug when dropping files in File app.

## 6.1.1 (2020-03-19)

* Fixed minification error in weavy.min.js.
* Fixed user profile not opening in modal as expected.
* Fixed url check error in client sdk. 

## 6.1.0 (2020-03-18)

* Fixed some issues with authenticating from client SDK.
* Fixed layout of embedded google doc.
* Fixed issue in WevDAV server that prevented some files from being opened in Microsft Office.
* Added download of non-previewable attachments. 
* Added config for CORS origins.
* Added paste as image to Messenger.
* Added user setting for Daily Digest email.
* Added comments section on files
* Increased key length for Apps and Spaces to 128 bytes.

## 6.0.1 (2020-03-12)

* Fixed sql error when validating app name on app where key is null.
* Fixed "CreateSpace permission denied" when initializing spaces from client SDK.
* Notification email now consolidates recent notifications.
* Added setting for custom automcomplete api endpoint.

## 6.0.0 (2020-03-09)

* Client SDK requires key when initializing spaces and apps.
* Fixed issue that prevented client SDK from creating spaces and apps with same names.
* Added "navigate" event to client SDK for handling navigation across apps.
* Added infinite scroll to notifications app.
* Filebrowser is loaded on demand.

## 5.0.2 (2020-03-02)

* Added thumbnail preview when uploading images to posts and comments
* Fixed problem with the license reported as invalid in some cases
* Weavy Filebrowser is now loading only when needed

## 5.0.1 (2020-02-25)

* Fixed a scaling issue with profile images in notification emails.
* Fixed problem with editing comments and content when embedded.
* Added support for profile picture claim. 

## 5.0.0 (2020-02-20)

* Added ability to configure Azure Blob Storage for storing files.
* Added Weavy Web View component to the Mobile SDK. 
* Moved configuration settings from custom element in web.config to standard app settings.
* Rewritten Client SDK.
* Stability improvements to Messenger.

## 4.0.3 (2019-11-18)

* Fixed some sign-in issues in the Client SDK.

## 4.0.2 (2019-10-01)

* Fixed an issue with SSO getting stuck in a loop.

## 4.0.1 (2019-09-30)

* Added ability to update user profile when signing in via JWT.
* Fixed an issue with uploading images when editing a Note.
* Fixed compilation warning that System.Web.Http could not be found.
* Removed invalid configuration for Microsoft.IdentityModel.Protocols from web.config.

## Weavy 4.0.0 (2019-07-04)

* Fixed a realtime connection bug when connecting multiple clients at the same time.
* Fixed an issue with signing out when using the sso plugin.
* Client: Added .ajax(..) method in the client for easy access to server JSON endpoints.
* Client: .close() supports optional panelId to only close a specific panel.
* Client: Fixed an issue with .sendToFrame() that caused an occational bug in sign-in. 

## 3.0.1 (2019-04-17)

* Added some missing icons

## 3.0.0 (2019-04-03)

* Added support for custom Content controllers.
* Added support for custom icons.
* Added support for multi-colored icons.
* Added setting for specifying if app/folder should allow multiple items with same names.
* Added PushService for sending realtime updates to connected clients.
* Added SSO to the Widget
* Updated the Widget UI and API with many new features
* Refactored configuration settings
* Refactored search methods to allow strongly typed search results.

## 2.0.4 (2019-01-09)

* Fixed an issue that caused a user with local account to be "locked out" when custom 
  authentication had user with same username as the local account.
* More extensive widget destruction

## 2.0.3 (2018-12-13)

* Fixed an issue with authentication on websocket connection.

## 2.0.2 (2018-11-20)

* Increased height of embedded Google Doc on Mac.
* Fixed "The request is invalid" error when adding file from cloud and folder already had an item 
  with the same name as the selected file.

## 2.0.1 (2018-11-16)

* Added jQuery noConflict to the Weavy Widget.
* Fixed an issue where file size was not displayed in the Files app.
* Fixed "Could not find entity to share" error when trying to share a file.
* Fixed an issue where context link was not displayed.
* Fixed an issue where conversation displayed the wrong user avatar.
* Fixed issue where password could not contain certain characters.
* Fixed problem with sometimes not being able to add members to a space.
* Fixed issue where clicking a notification did not scroll the related entity into view.

## 2.0.0 (2018-11-06)

Initial release of 2.0 with Weavy SDK for developers.

## 1.1.0 (2018-08-03)

* Cloud file picker - Add links to files from Google Drive, OneDrive, Dropbox and Box.
* Added more options how to connect a specific bubble to an url.
* Added possibility to add the current url as a context to posts, comments and messages.
* Introduced a new collapsed mode for the widget bubbles.
* Fixed widget layout issues in IE.
* Fixed an issue in the setup wizard not storing the submitted details correctly.

## 1.0.1 (2018-05-15)

* Fixed an issue that prevented infinite scroll from working.
* Fixed an issue where the weavy widget ui was incorrectly scaled in IE/Edge.
* Fixed an issue that prevented scroll from working on high-dpi screens in Chrome.

## 1.0.0 (2018-05-02)
