#media-uploader
================

__Lib for uploading media.__

The media-uploader will upload a media queue to any given url. The preferred method is XHR but it will automatically fallback to uploading in a iframe if XHR is not supported.


###Some important notes:

- Upload one or multiple files to a URL.
- Use XHRRequest if available, iframe fallback.
- Expects a JSON response from the server. If you do not plan on using JSON take a look at the skipParse option.

###Dependecies

- jQuery v1.11.1 minimum


###Events

The lib triggers the following events:

`media-uploader:start` 
_Upload process started._

`media-uploader:progress` 
_Upload process overall progress._

`media-uploader:done` 
_Upload process done. NOTE: The entire queue is passed with this event._

`media-uploader:file-start` 
_Upload of a file in the queue started._

`media-uploader:file-done` 
_Upload of a file in the queue is done. NOTE: The server response is passed with this event._

`media-uploader:file-error`
_Upload of a file in the queue errored. NOTE: The server response is passed with this event._



###Sample code

####Instantiation
```
var uploader = new MediaUploader(url, false);
```
_Create a new instance._

__Parameters:__

- __url__: {string} The URL of the upload script
- __skipParse__: {boolean} Optional: Skip the parseToJSON step. Set this to true when you don't return JSON serverside.


####Adding items

#####By querySelector

```
uploader.add(['input[type=file]']);
```

_If you add items by using querySelector the MediaUploader will pluck the items from the DOM._

__Parameters:__

- __items__: {string|input|array} A string or input element or array of strings or input elements.

#####By Input element

```
uploader.add([$('input[type=file]')]);
```

_If you add items by using DOM elements the MediaUploader will skip the plucking step. You can pass the DOM elements, jQuery wrapped or unwrapped._

__Parameters:__

- __items__: {string|input|array} A string or input element or array of strings or input elements.



####Start the upload

```
uploader.upload();
```



####Events

Listen to events using jQueries on, one and off methods.
