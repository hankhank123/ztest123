sap.ui.define([
		"zyytt1/zyytt1/controller/BaseController"
	], function (BaseController) {
		"use strict";

		return BaseController.extend("zyytt1.zyytt1.controller.NotFound", {

			/**
			 * Navigates to the worklist when the link is pressed
			 * @public
			 */
			onLinkPressed : function () {
				this.getRouter().navTo("worklist");
			}

		});

	}
);