/**
 * Media uploader lib
 *
 * Events:
 * - media-uploader:start
 * - media-uploader:progress
 * - media-uploader:done
 * - media-uploader:file-start
 * - media-uploader:file-done (file response)
 * - media-uploader:file-error
 *
 * @namespace
 * @name media-uploader.js
 * @author Rick Ekelschot | Code d'Azur
 * @date: 02/05/14
 */

/*jslint browser: true, nomen: true, devel: true */
/*global requirejs, define, window, document, $  */

(function (root, factory) {

    if (typeof define === 'function' && define.amd) {
        define(['jquery'], function (b) {
            return (root.amdWebGlobal = factory(b));
        });
    } else {
        root.amdWebGlobal = factory(root.b);
    }

} (this, function ($) {

    'use strict';

    var MediaUploader = (function (url, skipParse) {

        //private variables
        var _url = url,
            _uploading = false,
            _queue = [],
            _iframe,
            _currentIndex,
            _xhrSupported = null,
            _uploadSupported = null,
            _skipParse = (skipParse !== undefined && skipParse !== null) ? skipParse : false,
            _eventDispatcher = $('<div></div>'),
            _event = {
                START: 'media-uploader:start',
                PROGRESS: 'media-uploader:progress',
                DONE: 'media-uploader:done',
                FILE_START: 'media-uploader:file-start',
                FILE_DONE: 'media-uploader:file-done',
                FILE_ERROR: 'media-uploader:file-error'
            };

        //Private functions
        var uploadSupported,
            xhrSupported,
            addToQueue,
            doUpload,
            pickElements,
            startUpload,
            uploadDone,
            uploadNextInQueue,
            uploadMedia,
            uploadXhr,
            uploadIframe,
            uploadFileDone,
            uploadFileError,
            isDOMElement,
            createIframe,
            dispatchEvent;



        /**
         * Add a item to the queue
         *
         * @param item {string|dom element} The querySelector or DOM element
         */
        addToQueue = function (input) {
            if (typeof input === 'string') {
                input = $(input).length > 0 ? $(input)[0] : undefined;
            } else if (input instanceof jQuery) {
                input = input[0];
            } else if (!isDOMElement(input)) {
                throw new Error('Unexpected type passed. Media-uploader supports, querySelector string or input element.')
            }

            var object = {
                response: undefined,
                fileName: input.value,
                input: input,
                name: input.name
            };

            _queue.push(object);
        }



        /**
         * Start uploading the media
         */

        startUpload = function () {
            _currentIndex = 0;
            _uploading = true;

            dispatchEvent(_event.START);

            uploadNextInQueue();
        }


        /**
         * Upload the next item in the queue, if available
         */
        uploadNextInQueue = function () {
            if (_queue.length > 0 && _currentIndex < _queue.length) {
                dispatchEvent(_event.FILE_START, {
                    name: _queue[_currentIndex].name,
                    fileName: _queue[_currentIndex].fileName
                });

                if (xhrSupported()) {
                    uploadXhr(_queue[_currentIndex]);
                } else {
                    uploadIframe(_queue[_currentIndex]);
                }
            } else {
                uploadDone();
            }
        }


        /**
         * Upload the item using a XHR request
         *
         * @param item {object} The queue item
         */

        uploadXhr = function (item) {
            var file = item.input.files[0],
                xhr = new XMLHttpRequest(),
                data = new FormData(),
                response,
                parseError = false;

            data.append(item.input.name, file);

            xhr.onload = function (event) {
                response = event.target.response;
                if (!_skipParse) {
                    try {
                        response = $.parseJSON(response);
                    } catch (e) {
                        parseError = true;
                    }
                }

                if (event.target.status === 200 && !parseError) {
                    uploadFileDone(response);
                } else {
                    // Something went wrong
                    if (parseError) {
                        uploadFileError('JSON parse error');
                    } else {
                        uploadFileError(response);
                    }
                }
            };

            xhr.upload.onprogress = function (e) {
                if (e.lengthComputable) {
                    var p = Math.floor(((e.loaded / e.total) * 100) * ((_currentIndex + 1) / _queue.length));
                    dispatchEvent(_event.PROGRESS, p);
                }
            };

            xhr.open('POST', _url, true);
            xhr.send(data);
        }


        /**
         * Used for older browsers which don't support XHR
         *
         * @param item {object} The queue item
         */

        uploadIframe = function (item) {
            if (_iframe === undefined) {
                createIframe();
            }

            $(document.body).append(_iframe);

            var form = $('<form method="post" enctype="multipart/form-data" action="' + _url + '?iframe=true" target="' + _iframe.getAttribute('id') + '"></form>'),
                response,
                previousParent,
                parseError = false;

            // Store the previous parent to undo appending to form
            previousParent = $(item.input).parent();

            $(form).css({
                'position': 'absolute',
                'top': '-3000px'
            }).append($(item.input));

            $(document.body).append(form);


            $(_iframe).one('load', function (event) {
                response = $(_iframe).contents().text();
                if (!_skipParse) {
                    try {
                        response = $.parseJSON(response);
                    } catch (error) {
                        parseError = true;
                    }
                }


                if (!parseError) {
                    if (response.error) {
                        uploadFileError(response);
                    } else {
                        uploadFileDone(response);
                    }
                } else {
                    uploadFileError("JSON parse error");
                }

                $(_iframe).remove();

                if (previousParent) {
                    $(previousParent).append(item.input);
                }
            });

            try {
                form.submit();
            } catch (error) {
                throw new Error('Cannot submit form! ', error);
            }
        }


        /**
         * Create the iframe used when XHR is not available
         */

        createIframe = function () {
            var iframeId = 'image-upload-iframe-' + (Math.round(Math.random() * 100000));
            _iframe = $('<iframe width="1" border="1" height="100" id="' + iframeId + '" name="' + iframeId + '"></iframe>')[0];
            $(_iframe).css({
                'position': 'absolute',
                'top': '-3000px'
            });
        }


        /**
         * Called when a file upload succeeds.
         *
         * @param response {object} The server JSON response
         */

        uploadFileDone = function (response) {
            _queue[_currentIndex].response = response;
            dispatchEvent(_event.FILE_DONE, response);

            _currentIndex += 1;
            uploadNextInQueue();
        }


        /**
         * Called when a file upload fails, dispatches a media-uploader:file-error event.
         *
         * @param response {object|string} The server response or script error.
         */

        uploadFileError = function (response) {
            _queue[_currentIndex].response = response;
            _queue[_currentIndex].error = true;

            dispatchEvent(_event.FILE_ERROR, response);

            _currentIndex += 1;
            uploadNextInQueue();
        }



        /**
         * Called when the upload process is done. Dispatches a media-uploader:done event with a reference to the Queue
         */

        uploadDone = function () {
            _uploading = false;
            dispatchEvent(_event.DONE, _queue);
        }



        /**
         * Is upload supported on the device
         *
         * @returns {boolean} Upload is supported?
         */

        uploadSupported = function () {
            if (_uploadSupported !== null) {
                return _uploadSupported;
            }

            if (navigator.userAgent.match(/(Android (1.0|1.1|1.5|1.6|2.0|2.1))|(Windows Phone (OS 7|8.0))|(XBLWP)|(ZuneWP)|(w(eb)?OSBrowser)|(webOS)|(Kindle\/(1.0|2.0|2.5|3.0))/)) {
                _uploadSupported = false;
                return _uploadSupported;
            }
            var input = $('<input type="file" name="upload-test" />')[0];
            _uploadSupported = !input.disabled;

            return _uploadSupported;;
        }


        /**
         * Device/browser supports XHR uploads
         *
         * @returns {boolean} XHR supported
         */

        xhrSupported = function () {
            _xhrSupported = _xhrSupported === null ? (window.XMLHttpRequest !== undefined && window.FormData !== undefined) : _xhrSupported;
            return _xhrSupported;
        }



        /**
         * Is the element a DOM
         *
         * @param object {object} The element to inspect
         * @returns {boolean} Is a DOM element yes or no.
         */

        isDOMElement = function (object) {
            return (
                typeof HTMLElement === "object" ? object instanceof HTMLElement : //DOM2
                    object && typeof object === "object" && object !== null && object.nodeType === 1 && typeof object.nodeName==="string"
                );
        }



        /**
         * Dispatch a event
         * @param event {string}
         */

        dispatchEvent = function (event, args) {
            _eventDispatcher.trigger(event, args);
        }



        return {

            Event: _event,

            /**
             * Add a item to the media uploader
             *
             * @param items {array|string|DOM element} The item(s) that need to be uploaded.
             */

            add: function (items) {
                var item;

                if (!uploadSupported()) {
                    throw new Error('Upload is not supported. You can use uploadSupported()');
                }

                if (Object.prototype.toString.call(items) !== '[object Array]') {
                    items = [items];
                }

                for (item in items) {
                    addToQueue(items[item]);
                }

            },


            /**
             * Starts the upload process
             */

            upload: function () {
                startUpload();
            },


            /**
             * Is uploading supported by the device?
             */

            uploadSupported: function () {
                uploadSupported();
            },


            /**
             * Add a listener to the MediaUploader instance
             *
             * @param event {string} The event name
             * @param listener {function} The callback function
             * @param scope {object} The callback function's scope
             */
            on: function (event, listener, scope) {
                _eventDispatcher.on(event, listener, scope);
            },


            /**
             * Add a listener to the MediaUploader instance ONCE
             *
             * @param event {string} The event name
             * @param listener {function} The callback function
             * @param scope {object} The callback function's scope
             */
            one: function (event, listener, scope) {
                _eventDispatcher.one(event, listener, scope);
            },


            /**
             * Remove a listener of the MediaUploader instance
             *
             * @param event {string} The event name
             * @param listener {function} The callback function
             * @param scope {object} The callback function's scope
             */
            off: function (event, listener, scope) {
                _eventDispatcher.off(event, listener, scope);
            }

        }



    });


    return MediaUploader;

}));
