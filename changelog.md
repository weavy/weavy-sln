# Changelog for Weavy

## 8.2.0 (2021-04-16)

* Added navigation history states, history event and deep link support in client.
* Added maximize plugin in client.
* Changed weavy.timeout() to weavy.whenTimeout() in client.
* Changed client app/space whenLoaded/whenBuilt promises now resolve app/space for convenience.
* Improved client destroy.
* Improved client panels.
* Improved client logging.
* Fixed an issue when referencing a HTMLElement as container in the client.
* Fixed layout when using panel controls in client.
* Fixed issue with messenger back button.

## 8.1.0 (2021-03-08)

* Added ability to customize email templates for notifications etc.
* Added fulltext text search option for notifications.
* Fixed issue with notifications being sent for trashed entities.

## 8.0.5 (2021-02-19)

* Fixed an issue with the .off() method in the client preventing handlers to unregister properly.

## 8.0.4 (2021-02-08)

* Fixed issue where user interface was incorrectly updated after file upload.
* Fixed issue where edit file dialog displayed original, instead of updated filename.

## 8.0.3 (2020-12-04)

* Fixed issue with space/app key selector

## 8.0.2 (2020-12-03)

* Fixed issue with rotating doc preview.
* Fixed issue with starred folders opening in overlay.
* Client API jsdoc documentation.

## 8.0.1 (2020-11-19)

* Fixed some issues with client authentication and user change.
* Fixed issue with downloading files being corrupted.
* Fixed issue with attachments shown in double overlays.
* Fixed issue with clipped menu in messenger.

## 8.0.0 (2020-11-18)

* Added Tasks app for to-do lists etc.
* Added card view to Files app.
* Added option to create and attach video meetings to posts and comments.
* Added option to select files from cloud providers in posts, comments, messages etc.
* Added internationalization support making it possible to translate the UI to any language.
* Added option to pass in language and timezone when initializing new Weavy() from the client SDK.
* Added full browser window preview of files.
* Added preview for browser supported video and audio.
* Improved Note editor.
* Improved version browsing.
* Improved file renaming.
* Fixed issue with notifications created between 23:45pm and 00:00pm not being sent via email.
* Fixed issue with user timezone not being applied to outgoing emails.
* Removed Link content type.
* Replaced CloudLink content type with File.
* Replaced ContentService.GetRoots() and ContentService.GetHierarchy() with AppService.GetContent().
* Replaced IAsyncHook interface with IHook. All event handlers in hooks should new return void instead of Task.

## 7.4.3 (2020-11-10)

* Fixed issues with connection and authentication not being propagated in the client.

## 7.4.2 (2020-11-03)

* Fixed issues with destroy and event handling.

## 7.4.1 (2020-09-16)

* Fixed issue with new users not being created correctly when using a jwt token.

## 7.4.0 (2020-09-16)

* Added support for updating user avatar and name from jwt token.

## 7.3.2 (2020-09-02)

* Fixed issue with email notifications not being sent.
* Fixed unauthorized bug when jwt token specified both client_id and iss claim.

## 7.3.1 (2020-08-25)

* Fixed incorrect setting for CustomErrors in web.config.
* Increased column size for Tokens.AccessToken and Tokens.RefreshToken.

## 7.3.0 (2020-08-25)

* Added support for validating JWT tokens using JWK and JWKS.
* Added support for Open ID providers with multiple and rotating JWT signing keys.
* Fixed ajax catch promise handling in client.
* Fixed https setting in client for authentication and connection.

## 7.2.0 (2020-08-20)

* Added setting weavy.blob-whitelist for controlling the type of files that can be uploaded.
* Fixed toggling of properties tab in tiny mce image picker.

## 7.1.1 (2020-08-12)

* Fixed an issue with editing posts.

## 7.1.0 (2020-07-17)

* Notification.ReadAt property is now publicly available. Developers can now modifiy this value in a Hook or similar to manage the status of specific notifications.

## 7.0.0 (2020-07-07)

* Added user directory feature for separating users from different organizations. Primarily used for multi-tenant scenarios.
* Added fully customizable JSON REST API with functionality for getting, creating and updating Weavy resources. Developers can easily add their own API endpoints.
* Added integration with Zoom for video meetings.
* Added integration with Microsoft Teams for video meetings.
* Added seamless authentication when opening documents in Microsoft Office.
* Added Comments app for embedding rich commenting functionality to entities in your applicaton.
* Replaced the ambigous `filter` parameter in server SDK methods with `sudo` and `trashed` properties.
* Improved file previews. Image and file previews now open in a fullscreen overlay instead of in the app container.
* Replaced single `weavy.jwt-secret` setting with client registration where you can add multiple clients for API authentication and JWT validation. 
* Settings key for specifying a custom url to the File Browser is changed from weavy.client.filebrowser-url to wvy.file-browser. Check out https://docs.weavy.com/tutorials/weavyfilebrowser for more information.
* Client SDK now requires JWT token for authentication. See https://docs.weavy.com/client/authentication
* Client space open/close/toggle syntax has been removed. Use the equivalent app open/close/toogle syntax instead.
* Client jQuery noconflict improvements.
* Unified client promise naming. All promises are now used like functions `weavy.whenLoaded().then(...)`
* Removed some undocumented/deprecated Client methods.

### Upgrade instructions

In addition to the [normal upgrade procedure](https://docs.weavy.com/sdk/server/updating), there are a couple additional steps that you need to perform when upgrading to 7.0.

* Delete the App_Data\Index folder to force Weavy to recreate the index for fulltext search.
* Register a client on /manage/clients with `Client ID` = `iss` in your JWT tokens, and `Client Secret` = the `shared secret` or `public key` Weavy should use when validating incoming JWT tokens.
* Update code using the server SDK to use `sudo` and `trashed` properties instead of `filter` if applicable.
* You must provide a JWT token when instantiating `new Weavy({ jwt: "{token}" })`.

## 6.5.1 (2020-07-08)

* Fixed invisible progressbar.

## 6.5.0 (2020-06-25)

* Added space.remove() and app.remove().
* Improved client destroy.
* Client now allows multiple instances/spaces/apps in the same container.
* Improved cross-browser support.

## 6.4.4 (2020-06-23)

* WebDAV urls are generated with hostname configured in weavy.application-url.

## 6.4.3 (2020-05-29)

* Fixed CORS block for window registration in client.

## 6.4.2 (2020-05-20)

* Redirect to /sign-in with relative url.

## 6.4.1 (2020-05-14)

* Fixed regression bug in client navigation introduced in 6.4.0.
* Fixed regression bug in panel closing introduced in 6.4.0.
* Fixed an issue with signed in message being displayed after sign in.
* Added * (star) as email domain white listing option to allow all domains.

## 6.4.0 (2020-05-12)

* Fixed null reference exception introduced with AfterMentionUser event.
* Fixed open/toggle behavior in toggled client spaces. Now supports tabs correctly. Added space option { tabbed: true } as a new name for { toggled: true } which now is deprecated.
* Fixed an issue with signed in message being displayed after sign in.
* Fixed an issue with attachments for comments.
* Adjusted the main nav menu in mobile and standalone.

## 6.3.2 (2020-05-05)

* Fixed issue with push notifications in mobile.
* Fixed touch error in TinyMCE.
* Fixed loading issues for client apps.

## 6.3.1 (2020-04-23)

* Fixed issue with notifications app not receiving new notifications.

## 6.3.0 (2020-04-15)

* Added event AfterMentionUser.
* Fixed issue with cursor position after paste in html editor.

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
