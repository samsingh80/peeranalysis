sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../lib/jspdf/jspdf.umd.min",
    "../lib/dompurify/purify.min",
    "../lib/html2canvas/html2canvas.min"
], (Controller) => {
    "use strict";

    return Controller.extend("peeranalysis.controller.PeerAnaysisView", {
        onInit() {
            let oView = this.getView();
            oView.setBusy(false); // Show busy indicator
            this.onfetchRoles().then(resp=> console.log("resp" + resp));
        },
        onAfterRendering: function () {
            let me = this;
            me.attachEventchatFeedInput(me);
          },
          userlivechange: function (oEvent) {
            const userinp = oEvent.getParameter("value");
            const chatModel = this.getOwnerComponent().getModel("chatModel");
            if (!userinp || userinp == "/n") {
              chatModel.setSubmit(false);
            } else {
              chatModel.setSubmit(true);
            }
          },
            /**
     * Attach Enter Event for chatFeedInput
     * @param {object} controller this
     */
    attachEventchatFeedInput: function (controller) {
        let chatFeedInput = controller.getView().byId("chatFeedInput");
        let chatFeedSubmit = controller.getView().byId("chatFeedSubmit");
        chatFeedInput.attachBrowserEvent("keypress", function (event) {
          if (event.keyCode === 13 && chatFeedInput.getValue().trim() !== "") {
            chatFeedSubmit.firePress();
            chatFeedInput.setValue(null);
            event.preventDefault();
          }
        });
      },
 /**
     * Event handler for the chat entered by user
     * Calls the ai and return aresponse
     * @param {object} oEvent object
     */
 onUserChat: async function () {
  const chatModel = this.getOwnerComponent().getModel("chatModel");
  const oView = this.getView();
  const sInput = this.byId("chatFeedInput").getValue();

  // Disable submit + hide previous result
  chatModel.setSubmit(false);
  chatModel.setvisibleResult(false);

  // Create and show busy dialog
  const oBusyDialog = new sap.m.BusyDialog({
    title: "Busy Indicator",
    text: "Generating response. Please standby.."
  });
  oBusyDialog.open();

  // Freeze the screen
  oView.setBusy(true);

  // 🔁 Yield back to rendering thread before blocking async call
  await Promise.resolve();

  try {
    const resp = await this.onfetchData(sInput);

    chatModel.setResult(resp);
    chatModel.setvisibleResult(true);
    console.log(resp);
  } catch (err) {
    console.error("Chat fetch error:", err);
    sap.m.MessageToast.show("Failed to get response.");
  } finally {
    oBusyDialog.close();
    oView.setBusy(false);
  }
},

  /**
   * Copy the Agent Chat
   * @param {object} oEvent
   */
  onChatCopy: function () {
    const oChatBox = this.byId("ChatBotResult");
    const domRef = oChatBox?.getDomRef();
  
    if (!domRef) {
      sap.m.MessageToast.show("Nothing to copy");
      return;
    }
  
    const message = domRef.innerText;
  
    if (navigator?.clipboard && message) {
      navigator.clipboard
        .writeText(message)
        .then(() => {
          sap.m.MessageToast.show("Text copied to clipboard");
        })
        .catch((err) => {
          console.error("Copy failed", err);
          sap.m.MessageToast.show("Failed to copy text.");
        });
    }
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
  onfetchData: async function (sInput) {
     const chatUrl =  this.getBaseURL() + "/v2/odata/v4/earning-upload-srv/chatResponse";
     const csrfUrl = this.getBaseURL() + "/v2/odata/v4/earning-upload-srv/";
     const csrf = await this.onfetchCSRF(csrfUrl);

   // const url = "https://EarningsAIAssistantUI5-noisy-numbat-gk.cfapps.ap11.hana.ondemand.com/api/chat";


    try {
        let response = await fetch(chatUrl, {
            method: "POST",
            headers: { 
              "X-CSRF-Token":csrf,
              "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: sInput , token: csrf})
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        const sResponse = data.d.chatResponse.result;  // ✅ Store API response in a variable
        console.log("API Response:", sResponse);
        return sResponse;


        // Optional: Store result in SAPUI5 JSONModel
        // var oModel = new sap.ui.model.json.JSONModel({ apiResult: sResponse });
        // sap.ui.getCore().setModel(oModel, "chatModel");

    } catch (error) {
        console.error("API Error:", error);
    }
    
  },
   
  onfetchRoles : async function (params) {
    const chatModel = this.getOwnerComponent().getModel("chatModel");
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
      const hasScopeForView = roles.some(role => role.includes("scopeforview"));
      const hasScopeForManage = roles.some(role => role.includes("scopeformanage"));
      // chatModel.setenablUpload(hasScopeForManage);
      // chatModel.setenableQuery(hasScopeForView);    
      chatModel.setProperty("/enableUpload",hasScopeForManage);
      chatModel.setProperty("/enableQuery",hasScopeForView);    
      const sResponse = data.result;  // ✅ Store API response in a variable
      console.log("API Response:", sResponse);
      return sResponse;

  } catch (error) {
      console.error("API Error:", error);
  }


  },

  getBaseURL: function () {
    var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
    var appPath = appId.replaceAll(".", "/");
    var appModulePath = jQuery.sap.getModulePath(appPath);
    return appModulePath;
},   

  /**
   * Regenerate the Agent Chat
   * @param {object} oEvent
   * @param {object} controller
   */
  onChatRegenerate: function (oEvent) {
    const chatModel = this.getOwnerComponent().getModel("chatModel");
    const oSource = oEvent?.getSource();
    const userMessage = oSource?.data("userMessage");
    if (userMessage) {
      // triggerChat(this, sInput);
      chatModel.addUserChat(userMessage);
      const sResponse =
        '<html>\n<body>\n<h2>Top 5 Earning Items Summary</h2>\n\n<table border="1">\n  <tr>\n    <th>Item</th>\n    <th>Revenue (million)</th>\n    <th>Profit before tax (million)</th>\n    <th>Total assets (million)</th>\n  </tr>\n  <tr>\n    <td><strong>1. Total Corporate & Investment Banking</strong></td>\n    <td>$196,823</td>\n    <td>$118,106</td>\n    <td>$363,909</td>\n  </tr>\n  <tr>\n    <td><strong>2. Total Group</strong></td>\n    <td>$420,117</td>\n    <td>$193,115</td>\n    <td>$581,841</td>\n  </tr>\n  <tr>\n    <td><strong>3. Oil & Gas industry</strong></td>\n    <td>$7,421</td>\n    <td>$7,928</td>\n    <td>$21,440</td>\n  </tr>\n  <tr>\n    <td><strong>4. Commercial Real Estate</strong></td>\n    <td>$7,635</td>\n    <td>$2,758</td>\n    <td>$7,677</td>\n  </tr>\n  <tr>\n    <td><strong>5. Power industry</strong></td>\n    <td>$6,341</td>\n    <td>$4,538</td>\n    <td>$10,503</td>\n  </tr>\n</table>\n\n<h3>Key Points:</h3>\n<ul>\n<li>Corporate & Investment Banking and Total Group are the top earners by a significant margin</li>\n<li>Among industries, Oil & Gas, Commercial Real Estate, and Power are the highest earning sectors</li>\n<li>Data is sourced exclusively from non-transcript contexts as required</li>\n<li>Confidence is high for the reported figures, as they come directly from financial tables</li>\n<li>Some contextual information (e.g. year, specific segment breakdowns) is limited in the available non-transcript data</li>\n</ul>\n</body>\n</html>';
      chatModel.setResult(sResponse);
    }
  },

  /**
   * Export chat to pdf
   * @param {object} oEvent
   * @param {object} controller
   */
  // onChatExport: async function (oEvent) {
  //   const chatModel = this.getOwnerComponent().getModel("chatModel");
  //   const message = chatModel.getProperty("/result");
  //   if (message) {
  //     // Create PDF document
  //     var doc = new jspdf.jsPDF({
  //       orientation: "portrait",
  //       unit: "pt",
  //       format: "a4",
  //     });

  //     // Sanitize the HTML using DOMPurify
  //     var sanitizedHTML = DOMPurify.sanitize(message);
  //     await doc.html(sanitizedHTML, {
  //       width: 580,
  //       windowWidth: 580,
  //       margin: 15,
  //     });
  //     await doc.save();
  //   }
  // },

  // export V2
  
  // onChatExport: async function () {
  //   const oChatBox = this.byId("ChatBotResult");
  //   const domRef = oChatBox?.getDomRef();
  
  //   if (!domRef) {
  //     sap.m.MessageToast.show("No content to export");
  //     return;
  //   }
  
  //   const { jsPDF } = window.jspdf;
  //   domRef.classList.add("exporting");
  
  //   try {
  //     const canvas = await html2canvas(domRef, {
  //       scale: 2,
  //       useCORS: true,
  //       scrollY: 0,
  //       windowWidth: domRef.scrollWidth
  //     });
  
  //     const imgData = canvas.toDataURL("image/png");
  
  //     const pdf = new jsPDF("p", "pt", "a4");
  //     const pdfWidth = pdf.internal.pageSize.getWidth();
  //     const pdfHeight = pdf.internal.pageSize.getHeight();
  
  //     const canvasWidth = canvas.width;
  //     const canvasHeight = canvas.height;
  
  //     const imgHeight = (pdfWidth * canvasHeight) / canvasWidth;
  
  //     let heightLeft = imgHeight;
  //     let position = 0;
  
  //     // First page
  //     pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
  //     heightLeft -= pdfHeight;
  
  //     // More pages if needed
  //     while (heightLeft > 0) {
  //       position = heightLeft - imgHeight;
  //       pdf.addPage();
  //       pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
  //       heightLeft -= pdfHeight;
  //     }
  
  //     pdf.save("summary.pdf");
  //     sap.m.MessageToast.show("PDF exported successfully");
  
  //   } catch (err) {
  //     console.error("PDF generation failed", err);
  //     sap.m.MessageToast.show("Failed to export PDF");
  //   } finally {
  //     domRef.classList.remove("exporting");
  //   }
  // },

  onChatExport: async function () {
    if (!window.jspdf || !window.html2canvas) {
        sap.m.MessageToast.show("Required libraries not loaded.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const userInput = this.getView().getModel("chatModel").getProperty("/userMessage") || "";

    const domRef = this.byId("ChatBotResult")?.getDomRef();
    if (!domRef) {
        sap.m.MessageToast.show("No content to export");
        return;
    }

    // --- Create hidden container ---
    const wrapper = document.createElement("div");
    wrapper.style.width = "794px"; // A4 width in px at 96 DPI
    wrapper.style.padding = "20px";
    wrapper.style.background = "#fff";
    wrapper.style.fontFamily = "Arial, sans-serif";
    wrapper.style.position = "absolute";
    wrapper.style.top = "0";
    wrapper.style.left = "-9999px";
    document.body.appendChild(wrapper);

    // --- User Input Section ---
    const userInputBox = document.createElement("div");
    userInputBox.style.background = "linear-gradient(to right, #e8f0ff, #f2f6fd)";
    userInputBox.style.padding = "16px 24px";
    userInputBox.style.borderRadius = "8px";
    userInputBox.style.marginBottom = "24px";
    userInputBox.style.border = "1px solid #cdddfb";

    const headerText = document.createElement("div");
    headerText.textContent = "USER INPUT";
    headerText.style.fontSize = "18px";
    headerText.style.fontWeight = "bold";
    headerText.style.color = "#1a73e8";
    headerText.style.marginBottom = "8px";

    const userInputText = document.createElement("div");
    userInputText.textContent = userInput;
    userInputText.style.fontSize = "14px";
    userInputText.style.color = "#333";

    userInputBox.appendChild(headerText);
    userInputBox.appendChild(userInputText);
    wrapper.appendChild(userInputBox);

    // --- Clone Chat Response ---
    const responseClone = domRef.cloneNode(true);
    responseClone.style.margin = "0"; // prevent extra spacing
    wrapper.appendChild(responseClone);

    // --- Wait for DOM to layout ---
    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
        const canvas = await html2canvas(wrapper, {
            scale: 2,
            useCORS: true,
            scrollY: 0,
            windowWidth: wrapper.scrollWidth,
            height: wrapper.scrollHeight
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "pt", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save("Finsight_Chat_Export.pdf");
        sap.m.MessageToast.show("PDF exported successfully");

    } catch (err) {
        console.error("PDF export failed", err);
        sap.m.MessageToast.show("Failed to export PDF");
    } finally {
        document.body.removeChild(wrapper);
    }
},




  
 onGenEmbeddings: async function(){

  const chatModel = this.getOwnerComponent().getModel("chatModel");
  const url = "https://EarningsAIAssistantUI5-noisy-numbat-gk.cfapps.ap11.hana.ondemand.com/api/generate-embeddings";
  chatModel.setbusyText("Creating embeddings, please wait");
  chatModel.setbusyIndicator(true);


  try {
      const response = await fetch(url, {
          method: "POST",
      });

      if (!response.ok) {
        chatModel.setbusyIndicator(false);
         sap.m.MessageToast.show(response.status);
          throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const sResponse = data.message;  // ✅ Store API response in a variable
    if (sResponse) {
      chatModel.setbusyIndicator(false);
    sap.m.MessageToast.show(data.message);
    return;
}
      return sResponse;
 
  } catch (error) {
    chatModel.setbusyIndicator(false);
      console.error("API Error:", error);
  }     

 },
 


  onUploadFileContent: async function(oFile) {
    const chatModel = this.getOwnerComponent().getModel("chatModel");
    chatModel.setbusyText("File is getting uploaded");
    chatModel.setbusyIndicator(true);
    const url = "https://EarningsAIAssistantUI5-noisy-numbat-gk.cfapps.ap11.hana.ondemand.com/api/upload";
    let formData = new FormData();
    formData.append("file", oFile);

    try {
        const response = await fetch(url, {
            method: "POST",
            body : formData
        });

        if (!response.ok) {
          chatModel.setbusyIndicator(false);
           sap.m.MessageToast.show(response.status);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const sResponse = data.message;  // ✅ Store API response in a variable
      if (sResponse) {
        chatModel.setbusyIndicator(false);
      sap.m.MessageToast.show(data.message);
      return;
  }
        return sResponse;
        

        // Optional: Store result in SAPUI5 JSONModel
        // var oModel = new sap.ui.model.json.JSONModel({ apiResult: sResponse });
        // sap.ui.getCore().setModel(oModel, "chatModel");

    } catch (error) {
        console.error("API Error:", error);
    }     

    
  },

  onFileUpload: async function (oEvent) {

    let oFileUploader = oEvent.getSource();
    const oFile = oEvent.getParameters("files").files[0];
   

  this.onUploadFileContent(oFile);


     
  }  

    });
});