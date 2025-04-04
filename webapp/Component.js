sap.ui.define([
    "sap/ui/core/UIComponent",
    "peeranalysis/model/models",
     "peeranalysis/model/chatModel"
], (UIComponent, models,chatModel) => {
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

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
            
                        //Set Chat model
                        this.setModel(new chatModel(), "chatModel");

                        //RootPath
                        let oRootPath = jQuery.sap.getModulePath("earningsai"); // your resource root
                        let oImageModel = new sap.ui.model.json.JSONModel({
                            path: oRootPath,
                        });
            
                        this.setModel(oImageModel, "imageModel");

        }
    });
});