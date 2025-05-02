sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../lib/jspdf/jspdf.umd.min",
    "../lib/dompurify/purify.min",
    "../lib/html2canvas/html2canvas.min"
  ], function (Controller) {
    "use strict";
  
    return Controller.extend("peeranalysis.controller.ContentIngestionView", {
      onInit: function () {
        this._attachmentId = 0;
        this._uploaders = [];
  
        const oModel = new sap.ui.model.json.JSONModel({
          uploadedFiles: [] // Initial empty list
        });
        this.getView().setModel(oModel);

        this.onfetchRoles();


      },
  
      onAddAttachment: function () {
        const oVBox = this.byId("attachmentBox");
        const sId = "uploader_" + (++this._attachmentId);
  
        const oUploader = new sap.ui.unified.FileUploader({
          id: sId,
          name: "attachment",
          width: "100%",
          placeholder: "Choose a file...",
          buttonText: "Browse",
          fileType: ["pdf", "jpg", "png","xlsx","xls"],
          maximumFileSize: 50,
          change: function (oEvent) {
            const file = oEvent.getParameter("files")[0];
            if (file) {
              console.log("File selected: ", file.name);
            }
          }
        });
  
        const oDeleteButton = new sap.m.Button({
          icon: "sap-icon://delete",
          width: "10%",
          type: "Transparent",
          press: this.onDeleteUploader.bind(this),
          tooltip: "Remove this file"
        });
  
        const oRow = new sap.m.HBox({
          alignItems: "Center",
          justifyContent: "SpaceBetween",
          items: [oDeleteButton, oUploader]
        });
  
        oVBox.addItem(oRow);
        this._uploaders.push(oUploader);
      },
  
      onDeleteUploader: function (oEvent) {
        const oButton = oEvent.getSource();
        const oHBox = oButton.getParent();
        const oVBox = this.byId("attachmentBox");
  
        const oUploader = oHBox.getItems()[1]; // Uploader is second in the row
        const sUploaderId = oUploader.getId();
  
        // Remove from internal tracking
        this._uploaders = this._uploaders.filter(up => up.getId() !== sUploaderId);
  
        // Remove from UI
        oVBox.removeItem(oHBox);
  
        // Optionally remove from uploadedFiles model if it exists
        const oModel = this.getView().getModel();
        const aFiles = oModel.getProperty("/uploadedFiles") || [];
        const iIndex = aFiles.findIndex(f => f.uploaderId === sUploaderId);
        if (iIndex !== -1) {
          aFiles.splice(iIndex, 1);
          oModel.setProperty("/uploadedFiles", aFiles);
        }
      },

      getBaseURL: function () {
        var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
        var appPath = appId.replaceAll(".", "/");
        var appModulePath = jQuery.sap.getModulePath(appPath);
        return appModulePath;
    },  

    onfetchRoles: async function (params) {
      const oComponent = this.getOwnerComponent();
      const url = this.getBaseURL() + "/user-api/currentUser";
  
      try {
          const response = await fetch(url, {
              method: "GET",
              headers: { "Content-Type": "application/json" }
          });
  
          if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
          }
  
          const data = await response.json();
          const roles = data.scopes;
  
          const hasScopeForManage = roles.some(role => role.includes("scopeformanage"));
          const hasScopeForView = roles.some(role => role.includes("scopeforview"));
 
          // Create a new authModel for this controller
          const authModel = new sap.ui.model.json.JSONModel({
              isAdmin: hasScopeForManage,   // <-- simple boolean
              isViewer: hasScopeForView     // (optional) if you also want view-only rights
          });
  
          this.getView().setModel(authModel, "authModel");  // set the model with a named model
  
          console.log("Auth model created:", authModel.getData());
  
      } catch (error) {
          console.error("API Error:", error);
      }
  },

  


  calculateFileHash:async function (file) {
  const arrayBuffer = await file.arrayBuffer(); // Read the file into memory
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer); // Hash it
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // Convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // Bytes to hex
  return hashHex;
},
  
  onUploadFileContent: async function () {
    const oModel = this.getView().getModel();
    const aFiles = oModel.getProperty("/uploadedFiles");
    const that = this;
    const oPage = this.byId("page1"); // Get the Page control
    const url = this.getBaseURL() + "/odata/v4/earning-upload-srv/";

    try {
        // Show busy indicator
        oPage.setBusy(true);

        for (const uploader of this._uploaders) {
            const fileInput = uploader.getDomRef("fu");
            const file = fileInput?.files?.[0];
            if (!file) continue;
            const fileHash = await this.calculateFileHash(file);
            const embedding_url = this.getBaseURL() + "/odata/v4/earning-upload-srv/EmbeddingFiles";
            try {
                // Step 1: Create EmbeddingFiles entity
                const createResponse = await fetch(embedding_url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        ID: fileHash,  
                        fileName: file.name,
                        mediaType: file.type,
                        url: "",
                        status: "submitted"
                    })
                });

                if (!createResponse.ok) {
                  if (createResponse.status === 400) {
                    // Handle 'Entity already exists'
                    sap.m.MessageToast.show("File already exists " + file.name + ".....Skipping creation.");
                } else {
                    // Other errors
                    throw new Error(`Entity creation failed: ${createResponse.status}`);
                }

                }
                const created = await createResponse.json();
                // const id = created.ID;
                // const content_url = this.getBaseURL() + "/odata/v4/earning-upload-srv/EmbeddingFiles(" + fileHash + ")/content";
                const content_url = this.getBaseURL() + "/odata/v4/earning-upload-srv/EmbeddingFiles('" + fileHash + "')/content";

                // Step 2: Upload file content
                await fetch(content_url, {
                    method: "PUT",
                    headers: {
                        "Content-Type": file.type,
                        "Slug": encodeURIComponent(file.name)
                    },
                    credentials: "include",
                    body: file
                });

                // Upload success - Now reload model data!
                var oTable = that.byId("uploadedFilesTable");
                var oBinding = oTable.getBinding("rows");
                if (oBinding) {
                    oBinding.refresh();
                }

            } catch (err) {
                console.error("Upload error:", err);
                sap.m.MessageBox.error("Upload failed. Please try again.");
            }
        }

    } catch (e) {
        console.error("Failed to fetch CSRF token or execute upload:", e);

    } finally {
      oPage.setBusy(false);

      const oVBox = this.byId("attachmentBox");

      for (const oUploader of this._uploaders) {
          const oHBox = oUploader.getParent(); // Parent is the HBox
          if (oHBox) {
              oVBox.removeItem(oHBox);
              oHBox.destroy();
          }
      }
      this._uploaders = []; // Clean the uploaders list
  }

    oModel.setProperty("/uploadedFiles", aFiles);
}
      

    });
  });
  