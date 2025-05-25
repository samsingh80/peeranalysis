sap.ui.define(["sap/ui/model/json/JSONModel"], function (JSONModel) {
  "use strict";

  const initialData = {
    busyIndicator: false,
    enableSubmit: false,
    visibleResult:false,
    enableUpload: true,
    enableQuery: true,
    userMessage : "",
    placeHolder : "Bank: [Enter bank name e.g. Standard Chartered, HSBC]\nPeriod: [Enter period e.g. 1Q 2025]\nUser Prompt: [Enter your prompt]",
    busyText:"",
    result:      "",
    maker: true,
    checker: true,
  
  }; 
  return JSONModel.extend("com.sap.shae.flp.plugins.homepage.chatModel", {
    /**
     * Constructor for the Chat Model - initialize the data
     */
    constructor: function () {
      JSONModel.prototype.constructor.apply(this, arguments);

      this.reset();
    },

    /**
     * Resets the model's Chat
     */
    reset: function () {
      this.setProperty("/", Object.create(initialData));
    },

    /**
     * Set Enable Submit button
     *
     * @param {Boolean}  value
     */
    setSubmit: function (enableSubmit) {
      this.setProperty("/enableSubmit", enableSubmit);
    },

    /**
     * Set Enable Result Box
     *
     * @param {Boolean}  value
     */
    setvisibleResult: function (visibleResult) {
      this.setProperty("/visibleResult", visibleResult);
    },
   
    /**
     * Set Bot Chat Message
     *
     * @param {String}  message
     */
    setResult: function (result) {
      this.setProperty("/result", result);
    },

    setbusyIndicator: function (busyind){
      this.setProperty("/busyIndicator",  busyind);
    },

    setenableUpload: function (uploadflag){
      this.setProperty("/enableUpload",  uploadflag);
    },

    setenableQuery: function (equery){
      this.setProperty("/enableQuery",  equery);
    },
    setbusyText: function (text){
      this.setProperty("/busyText",  text);
    }

  });
});
