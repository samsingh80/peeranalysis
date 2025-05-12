sap.ui.define([
    "sap/ui/core/UIComponent",
    "peeranalysis/model/models",
     "peeranalysis/model/chatModel",
     "sap/ui/model/odata/v4/ODataModel"
], (UIComponent, models,chatModel,ODataModel,uploadEarnings) => {
    "use strict";

    return UIComponent.extend("peeranalysis.Component", {
        metadata: {
       
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);
            this.getRouter().initialize();
            this.getModel("embeddings");

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
           
            
                        //Set Chat model
                        this.setModel(new chatModel(), "chatModel");

                        //RootPath
                        let oRootPath = jQuery.sap.getModulePath("earningsai"); // your resource root
                        let oImageModel = new sap.ui.model.json.JSONModel({
                            path: oRootPath,
                        });
            
                        this.setModel(oImageModel, "imageModel");

                        const oContentModel = new ODataModel({
                            serviceUrl: "./odata/v4/earning-upload-srv/",
                            synchronizationMode: "None", // or "Auto" depending on your use case
                            operationMode: "Server", 
                            groupId: "$auto",
                            updateGroupId: "$auto",
                            autoExpandSelect: true
                          });
                    
                          // Set the model to the component with a name
                          this.setModel(oContentModel, "contentModel");

                        //   jQuery.sap.registerModulePath("com.scb.uploadearnings", "../com.scb.uploadearnings");
                          

        }
    });
});