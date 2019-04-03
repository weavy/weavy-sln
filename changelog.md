# Changelog for Weavy

## Weavy 3.0

Weavy 3.0 improves the Weavy SDK and Widget API.

### 3.0.0 (2019-04-03)

* Added support for custom Content controllers.
* Added support for custom icons.
* Added support for multi-colored icons.
* Added setting for specifying if app/folder should allow multiple items with same names.
* Added PushService for sending realtime updates to connected clients.
* Added SSO to the Widget
* Updated the Widget UI and API with many new features
* Refactored configuration settings
* Refactored search methods to allow strongly typed search results.

#### Breaking changes

* All Search methods in the Service layer have new return types. If you have used any of these 
  methods in your custom code you will need to update your code. As an example, 
  UserService.Search(UserQuery query) previously returned SearchResult<User, UserQuery> and now 
  returns an instance of the UserSearchResult class.
* Removed abstract base class ItemBase. Content types should now inherit from the Content class.
* Replaced abstract base classes FileBase and FolderBase with IFile and IFolder interfaces.
* Replaced the Html.SvgIcon extension method with Svg.Icon
* Custom authentication endpoints should return JWT token instead of claims.

## Weavy 2.0

Weavy 2.0 introduces the Weavy SDK, allowing developers to extend Weavy with additional 
functionality. See https://docs.weavy.com for more information.

### 2.0.4 (2019-01-09)

* Fixed an issue that caused a user with local account to be "locked out" when custom 
  authentication had user with same username as the local account.
* More extensive widget destruction

### 2.0.3 (2018-12-13)

* Fixed an issue with authentication on websocket connection.

### 2.0.2 (2018-11-20)

* Increased height of embedded Google Doc on Mac.
* Fixed "The request is invalid" error when adding file from cloud and folder already had an item 
  with the same name as the selected file.

### 2.0.1 (2018-11-16)

* Added jQuery noConflict to the Weavy Widget.
* Fixed an issue where file size was not displayed in the Files app.
* Fixed "Could not find entity to share" error when trying to share a file.
* Fixed an issue where context link was not displayed.
* Fixed an issue where conversation displayed the wrong user avatar.
* Fixed issue where password could not contain certain characters.
* Fixed problem with sometimes not being able to add members to a space.
* Fixed issue where clicking a notification did not scroll the related entity into view.

### 2.0.0 (2018-11-06)

Initial release of 2.0 with Weavy SDK for developers.

### Upgrade instructions

There is no automated upgrade process for upgrading from Weavy 1.x to 2.x. 
If you need to migratean existing 1.x installation to 2.x you should contact support@weavy.com for 
instructions.

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

## Weavy 1.0

Initial release of Weavy.

### 1.0.1 (2018-05-15)

* Fixed an issue that prevented infinite scroll from working.
* Fixed an issue where the weavy widget ui was incorrectly scaled in IE/Edge.
* Fixed an issue that prevented scroll from working on high-dpi screens in Chrome.

### 1.0.0 (2018-05-02)
