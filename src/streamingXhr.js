/**
 * An xhr wrapper that calls a callback whenever some more of the
 * response is available, without waiting for all of it.
 * 
 * This probably needs more development and testing more than most other parts 
 * of Oboe.
 *
 * TODO:
 *    error handling
 *    allow setting of request params and other such options
 *    x-browser testing, compatibility
 */
var streamingXhr = (function () {
   
   /* xhr2 already supports everything that we need so very little abstraction required.\
   *  listenToXhr2 is one of two possible values to use as listenToXhr  
   */
   function listenToXhr2(xhr, progressListener, completeListener) {      
      xhr.onprogress = progressListener;
      xhr.onload = completeListener;
   }

   /* xhr1 supports little so a bit more work is needed 
    * listenToXhr1 is one of two possible values to use as listenToXhr  
    */           
   function listenToXhr1(xhr, progressListener, completeListener){
   
      // We are recieving the content, check for progress as often as the browser allows. 
      // The progress listener makes sure there is something to report so just call it as often 
      // as possible regardless of if something happened to the xhr1 object.
      var interval = window.setInterval(progressListener, 0);      
   
      // handle the request being complete: 
      xhr.onreadystatechange = function() {

         if(this.readyState == 4 ) {
         
            // XHR is complete. Notify of completeness and stop notifying of progress:
            if( this.status == 200 ) {             
               completeListener();
            }
            
            window.clearInterval(interval);
         }               
      };
   }
      
   function supportsXhr2(){
      return ('onprogress' in new XMLHttpRequest());
   }      
   
   /* listenToXhr will be set to the appropriate function for XHR1 or XHR2 depending on what the browser
    * supports
    * 
    * @function
    * 
    * @param {XmlHttpRequest} xhr
    * @param {Function} progressListener
    * @param {Function} completeListener
    */
   var listenToXhr = supportsXhr2()? listenToXhr2 : listenToXhr1;   
   
   /**
    * Fetch something over ajax, calling back as often as new data is available.
    * 
    * @param {String} url
    * @param {Function(String nextResponseDrip)} progressCallback
    *    A callback to be called repeatedly as the input comes in.
    *    Will be passed the new string since the last call.
    * @param {Function(String wholeResponse)} doneCallback
    *    A callback to be called when the request is complete.
    *    Will be passed the total response
    */
   return { 
      fetch: function(url, progressCallback, doneCallback){
      
         doneCallback = doneCallback || always;
      
         var xhr = new XMLHttpRequest();
         var numberOfCharsGivenToCallback = 0;
   
         xhr.open("GET", url, true);
         xhr.send(null);
   
         function handleProgress() {
            
            try{
               var textSoFar = xhr.responseText;
            } catch(e) {
               // ie sometimes errors if you try to get the responseText too early but just
               // ignore it when this happens.
               return;
            }
   
            if( textSoFar.length > numberOfCharsGivenToCallback ) {
   
               var latestText = textSoFar.substr(numberOfCharsGivenToCallback);
   
               progressCallback( latestText );
   
               numberOfCharsGivenToCallback = textSoFar.length;
            }
         }
         
         function handleDone() {
            // in case the xhr doesn't support partial loading, by registering the same callback
            // onload, we at least get the whole response. This shouldn't be necessary once
            // polling is implemented in lieu of onprogress.      
            handleProgress();
            
            doneCallback( xhr.responseText );
         }      
            
         listenToXhr( xhr, handleProgress, handleDone);
      }
   };   

})();
