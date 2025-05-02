sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
  ], function (Controller, MessageToast) {
    "use strict";
  
    return Controller.extend("peeranalysis.controller.Approval", {
      onInit: function () {
        this.oModel = this.getView().getModel(); // assume it's already set globally
      },

      onFileSelect: function (oEvent) {
        const oSelectedItem = oEvent.getParameter("listItem").getBindingContext().getObject();
        const sId = oSelectedItem.ID;
        const sFileType = oSelectedItem.mediaType; // Assuming you have 'application/pdf' etc
      
        const sFileUrl = `/odata/v4/earning-upload-srv/EmbeddingFiles(${sId})/content`;
      
        this.getView().getModel("contentModel").setProperty("/selectedFileUrl", sFileUrl);
        this.getView().getModel("contentModel").setProperty("/selectedFileType", sFileType.includes("pdf") ? "pdf" : "image");
      },
      
  
      onRowPress: function (oEvent) {
        const oItem = oEvent.getParameter("listItem");
        const oContext = oItem.getBindingContext();
        this._selectedContext = oContext;
        MessageToast.show("File selected: " + oContext.getProperty("fileName"));
      },
  
      onApprove: function () {
        if (!this._selectedContext) return MessageToast.show("Please select a file");
        this._selectedContext.setProperty("status", "Approved");
        MessageToast.show("File approved.");
      },
  
      onReject: function () {
        if (!this._selectedContext) return MessageToast.show("Please select a file");
        this._selectedContext.setProperty("status", "Rejected");
        MessageToast.show("File rejected.");
      }
    });
  });
  