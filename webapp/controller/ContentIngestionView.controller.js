sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../lib/jspdf/jspdf.umd.min",
    "../lib/dompurify/purify.min",
    "../lib/html2canvas/html2canvas.min"
  ], function (Controller) {
    "use strict";
  
    return Controller.extend("peeranalysis.controller.ContentIngestionView", {
        onInit: function () {
            this.onfetchRoles();
            this._attachmentId = 0;
            this._uploaders = [];
          
            const oSmartTable = this.byId("smartTable");
            const oModel = this.getOwnerComponent().getModel("embeddings");
            this.getView().setModel(oModel);
          
            if (!oModel || !oSmartTable) {
              console.error("Model or SmartTable not found");
              return;
            }
          
            oSmartTable.setModel(oModel);
            oSmartTable.setEntitySet("EmbeddingFiles");
          
            // Rebind the table first
            oSmartTable.rebindTable();
          
            // Wait for SmartTable's internal table to be available
            oSmartTable.attachEventOnce("modelContextChange", () => {
              const oResponsiveTable = oSmartTable.getTable();
          
              // Defensive check
              if (!oResponsiveTable || !oResponsiveTable.isA("sap.m.Table")) {
                console.error("Expected ResponsiveTable not found.");
                return;
              }
          
              oResponsiveTable.setMode("MultiSelect");
          
              // Intercept user selection
              oResponsiveTable.attachSelectionChange((oEvent) => {
                const oTable = oEvent.getSource();
                const aSelectedItems = oTable.getSelectedItems();
          
                aSelectedItems.forEach((oItem) => {
                  if (oItem.data("selectable") === false) {
                    oTable.removeSelections(true); // Deselect all
                  }
                });
              });
          
              // Visually and logically mark rows after data is loaded
              oResponsiveTable.attachUpdateFinished(() => {
                oResponsiveTable.getItems().forEach((oItem) => {
                  const oCtx = oItem.getBindingContext();
                  const status = oCtx?.getProperty("status");
          
                  if (status !== "Submitted") {
                    oItem.addStyleClass("nonSelectableRow");
                    oItem.data("selectable", false);
                  } else {
                    oItem.data("selectable", true);
                    oItem.setType("Active");
                  }
                });
              });
            });                      
            // Run initial search to trigger binding
            const oFilterBar = this.byId("smartFilterBar");
            oFilterBar.attachInitialise(() =>{
              const oAuthModel = this.getView().getModel("authModel");
              const bIsAdmin  = oAuthModel?.getProperty("/isAdmin");
              if(bIsAdmin){
                const oCurrentFilters = oFilterBar.getFilterData();
                if(!oCurrentFilters.status){
                  oFilterBar.setFilterData({status:"Submitted"});
                  oFilterBar.search();
                }
              }else{
                oFilterBar.search();
              }


            });
            
          },

      onBeforeRebindTable: function (oEvent) {
        var oBindingParams = oEvent.getParameter("bindingParams");
        var oTable = oEvent.getSource().getTable();
    
        // Enable multi-select mode
        oTable.setMode("MultiSelect");
        oTable.attachUpdateFinished(function () {
            oTable.getItems().forEach(function (oItem) {
                const oContext = oItem.getBindingContext();
                const status = oContext?.getProperty("status");
                if (status !== "Submitted") {
                    oItem.data("selectable", false);
                }
    
            });
        });
    
        // Set row selectability dynamically (Optional: See Step 3)
    },

      onSetTableData: function(){
        const oTable = this.byId("uploadedFilesTable");
        const oBinding = oTable.getBinding("rows");
    
        if (oBinding) {
            const oFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "Submitted");
            oBinding.filter([oFilter]);
        } else {
            // in case the binding isn't ready yet, wait and retry after rendering
            oTable.attachEventOnce("updateFinished", () => {
                const oBindingAfter = oTable.getBinding("rows");
                if (oBindingAfter) {
                    const oFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "Submitted");
                    oBindingAfter.filter([oFilter]);
                }
            });
        }

      },
      
      
      onTableRefresh: function(){

        const oModel = this.getView().getModel();
        oModel.refresh(true);
        const oTable = this.byId("smartTable");
        oTable.rebindTable(true);
        const oInnerTable = oTable.getTable();
        if (oInnerTable){
          const oBinding = oInnerTable.getBinding("rows") || oInnerTable.getBinding("items");
          if (oBinding) {
            oBinding.refresh(true);
        }

        }

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

 onApproveFiles: async function () {
  const oTable = this.byId("smartTable").getTable();
  const aSelectedItems = oTable.getSelectedItems();
  const oModel = this.getView().getModel();
  const oView = this.getView();
  const baseUrl = this.getBaseURL();
  let oCtx;
  let busyDialogTxt = " ";

  const embeddingUrl = "https://EarningsAIAssistantUI5-noisy-numbat-gk.cfapps.ap11.hana.ondemand.com/api/generate-embeddings";
  const csrfUrl = baseUrl + "/v2/odata/v4/earning-upload-srv/";
  const csrf = await this.onfetchCSRF(csrfUrl);

  if (aSelectedItems.length === 0) {
    sap.m.MessageToast.show("Please select at least one file.");
    return;
  }

  oView.setBusy(true);

  const successList = [];
  const failedList = [];

  // Step 1: Update status of each file to "Approved"
  for (const oItem of aSelectedItems) {
   oCtx  = oItem.getBindingContext();
    const fileId = oCtx.getProperty("ID");
    const fileUrl = `${baseUrl}/v2/odata/v4/earning-upload-srv/EmbeddingFiles/${fileId}`;
   
    try {
      await fetch(fileUrl, {
        method: "PATCH",
        headers: {
         "X-CSRF-Token": csrf,
         "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ status: "Approved" })
      });

      oModel.setProperty(oCtx.getPath() + "/status", "Approved");
      // oTable.removeSelection(oTable.indexOfItem(oItem));
      successList.push(fileId);
    } catch (error) {
      console.error(`Approval failed for file ${fileId}:`, error);
      failedList.push(fileId);
    }
  }

 

  // Step 2: Call downstream API only if all PATCHes succeeded
  if (failedList.length === 0) {
    busyDialogTxt = "Embedding is getting generated...";
    const oBusyDialog = new sap.m.BusyDialog({
      title: "Generating Embeddings",
      text: busyDialogTxt
    });
    oBusyDialog.open();

    try {
      const restResponse = await fetch(embeddingUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });



      if (!restResponse.ok) {
        sap.m.MessageToast.show(restResponse.status);
        throw new Error(`REST call failed with status ${restResponse.status}`);
      }else{
        await this._readEntitySetAsync(this.getView().getModel(), "/EmbeddingFiles");
        this.onTableRefresh();
        oModel.setProperty(oCtx.getPath() + "/status", "Completed");

    //     await this._readEntitySetAsync(this.getView().getModel(), "/EmbeddingFiles");
    //     const oEmbTable = this.byId("smartTable");
    //     oEmbTable.rebindTable();
    // //    this.getView().getController().onInit();
    //     oBusyDialog.close();
    //        sap.m.MessageBox.success(`${successList.length} file(s) approved and embeddings generated.`);
    //        const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
    //        oRouter.navTo("ContentIngestionView",{},true);

          
      }

      // sap.m.MessageToast.show(`${successList.length} file(s) approved and embeddings generated.`);
      // sap.m.MessageBox.Success(`${successList.length} file(s) approved and embeddings generated.`);
    } catch (restErr) {
      oBusyDialog.close();
      oView.setBusy(false);
      console.error("Downstream API call failed:", restErr);
      sap.m.MessageBox.error("Files were approved but embedding generation failed.");
    }
    finally {
      oBusyDialog.close();
      oView.setBusy(false);
    }
  } else {
    sap.m.MessageBox.warning(`${failedList.length} file(s) failed to approve:\n\n${failedList.join(", ")}`);
  }





  //  const oInnerTable = oEmbTable.getTable();
  // if (oInnerTable){
  //   const oBinding = oInnerTable.getBinding("rows") || oInnerTable.getBinding("items");
  //   if (oBinding) {
  //     oBinding.refresh(true);
  //     oEmbTable.Invalidate();
  // }

 
  // }
  
  },
 
  _readEntitySetAsync:function (oModel,sPath){

    return new Promise((resolve, reject) =>{
      oModel.read(sPath,{
        success:(data) => resolve(data),
        error: (err) => reject(err)
      });

    });
  },

 
  onRejectFiles: function () {
    const oTable = this.byId("smartTable").getTable();
    const aSelectedItems = oTable.getSelectedItems();
  
    if (aSelectedItems.length === 0) {
      sap.m.MessageToast.show("Please select a file to reject.");
      return;
    }
  
    // Store selected contexts for use in submit
    this._rejectionContexts = aSelectedItems.map(item => item.getBindingContext());
  
    if (!this._rejectionDialog) {
      this._rejectionDialog = sap.ui.xmlfragment("peeranalysis.fragment.RejectionDialog", this);
      this.getView().addDependent(this._rejectionDialog);
    }
  
    this._rejectionDialog.open();
  },
  
  onSubmitRejection: async function () {
    const oComment = sap.ui.getCore().byId("rejectionComment").getValue();
    const oModel = this.getView().getModel();
    const baseUrl = this.getBaseURL();
    let serviceUrl = baseUrl + "/v2/odata/v4/earning-upload-srv/EmbeddingFiles/" ;

    async function fetchCsrfToken(url) {
      const response = await fetch(url, {
          method: "HEAD",
          credentials: "include",
          headers: {
              "X-CSRF-Token": "Fetch"
          }
      });
      const token = response.headers.get("X-CSRF-Token");
      if (!token) {
          throw new Error("Failed to fetch CSRF token");
      }
      return token;
  }
  
    for (const oCtx of this._rejectionContexts) {
      const fileId = oCtx.getProperty("ID");
      serviceUrl = serviceUrl+fileId;
      const csrfToken = await fetchCsrfToken(serviceUrl);
      // Send rejection update to backend
      await fetch(serviceUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken

        },
        body: JSON.stringify({ comments: oComment,
          status: "Rejected"
         })
      });
  
      // Update model locally
      oModel.setProperty(oCtx.getPath() + "/status", "Rejected");
    }
  
    this._rejectionDialog.close();
    oModel.refresh(true);
    sap.m.MessageToast.show("Files rejected.");
  },
  
  onCancelRejection: function () {
    this._rejectionDialog.close();
  },

onfetchCSRF: async function(url){
  const response = await fetch(url, {
    method: "HEAD",
    credentials: "include",
    headers: {
        "X-CSRF-Token": "Fetch"
    }
});
const token = response.headers.get("X-CSRF-Token");
if (!token) {
    throw new Error("Failed to fetch CSRF token");
}
return token;
}, 
  
onUploadFileContent: async function () {
  const oModel = this.getView().getModel();
  const aFiles = oModel.getProperty("/uploadedFiles");
  const that = this;
  const oPage = this.byId("page1");
  const baseUrl = this.getBaseURL();
  const serviceUrl = baseUrl + "/v2/odata/v4/earning-upload-srv/";

  // Helper to fetch CSRF token
  async function fetchCsrfToken(url) {
      const response = await fetch(url, {
          method: "HEAD",
          credentials: "include",
          headers: {
              "X-CSRF-Token": "Fetch"
          }
      });
      const token = response.headers.get("X-CSRF-Token");
      if (!token) {
          throw new Error("Failed to fetch CSRF token");
      }
      return token;
  }

  try {
      oPage.setBusy(true);

      const csrfToken = await fetchCsrfToken(serviceUrl);

      for (const uploader of this._uploaders) {
          const fileInput = uploader.getDomRef("fu");
          const file = fileInput?.files?.[0];
          if (!file) continue;

          const fileHash = await this.calculateFileHash(file);
          const embedding_url = serviceUrl + "EmbeddingFiles";

          try {
              // Step 1: Create EmbeddingFiles entity
              const createResponse = await fetch(embedding_url, {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                       "X-CSRF-Token": csrfToken
                  },
                  credentials: "include",
                  body: JSON.stringify({
                      ID: fileHash,
                      fileName: file.name,
                      mediaType: file.type,
                      url: "./v2/odata/v4/earning-upload-srv/EmbeddingFiles('" +fileHash + "')/content",
                      status: "Submitted"
                  })
              });

              if (!createResponse.ok) {
                  if (createResponse.status === 400) {
                      sap.m.MessageToast.show("File already exists " + file.name + ".....Skipping creation.");
                  } else {
                      throw new Error(`Entity creation failed: ${createResponse.status}`);
                  }
              }

              const content_url = serviceUrl + "EmbeddingFiles('" + fileHash + "')/content";

              // Step 2: Upload file content
              await fetch(content_url, {
                  method: "PUT",
                  headers: {
                      "Content-Type": file.type,
                      "Slug": encodeURIComponent(file.name),
                       "X-CSRF-Token": csrfToken
                  },
                  credentials: "include",
                  body: file
              });

              // Refresh model data
              const oModel = this.getView().getModel();
              oModel.refresh(true);
              const oTable = that.byId("smartTable");
              const oInnerTable = oTable.getTable();
              if (oInnerTable){
                const oBinding = oInnerTable.getBinding("rows") || oInnerTable.getBinding("items");
                if (oBinding) {
                  oBinding.refresh();
              }

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
          const oHBox = oUploader.getParent();
          if (oHBox) {
              oVBox.removeItem(oHBox);
              oHBox.destroy();
          }
      }
      this._uploaders = [];
  }

  oModel.setProperty("/uploadedFiles", aFiles);
}
   

    });
  });
  