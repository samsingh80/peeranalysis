sap.ui.define([
  "sap/ui/core/mvc/Controller"
], (BaseController) => {
  "use strict";

  return BaseController.extend("peeranalysis.controller.App", {
      onInit() {
      },
      onAfterRendering(){
        const oSideNavigation = this.getView().byId("sideNavigation");
        oSideNavigation.setExpanded(false);
      },
      
      /**
       * Triggered when side navigation pressed
       * 
       * @param {object} oEvent instance 
       */
      onSideNavButtonPress: function () {
        const oSideNavigation = this.getView().byId("sideNavigation");
        const bExpanded = oSideNavigation.getExpanded();
        oSideNavigation.setExpanded(!bExpanded);
      },

      /**
       * Triggers when Menu Item Selected
       * @param {object} oEvent button event
       */
      onItemSelect: function (oEvent) {
        const oTarget = oEvent?.getSource()?.getSelectedKey();
        // Util.navTo(this, oTarget);
        this.getOwnerComponent().getRouter().navTo(oTarget);
      }


  });
});