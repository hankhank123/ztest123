/*global location history */
sap.ui.define([
	"zyytt1/zyytt1/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"zyytt1/zyytt1/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function(BaseController, JSONModel, History, formatter, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("zyytt1.zyytt1.controller.Worklist", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function() {
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				saveAsTileTitle: this.getResourceBundle().getText("saveAsTileTitle", this.getResourceBundle().getText("worklistViewTitle")),
				shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0,
				gjahr: "555"
			});
			this.setModel(oViewModel, "worklistView");
	

			oTable.attachUpdateStarted(this, function(oEvent) {
			
			});
		
			if (this.getRouter().getRoute("worklist")) {
				debugger;
				this.getRouter().getRoute("worklist").attachPatternMatched(this._onObjectMatched, this);
			}

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function(oEvent) {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
				debugger;

				var aData = (oTable.getItems() || []).map(function(oItem) {
					// assuming that you are using the default model  
					return oItem.getBindingContext().getObject();
				});

				//	var oFilter1 = new sap.ui.model.Filter("gjahr", sap.ui.model.FilterOperator.EQ, "1234");

				//	this.getBinding("items").filter(oFilter1, sap.ui.model.FilterType.Application);

				var sPath = "/zv_bkpf(CompanyCode='1000',belnr='1000000000',gjahr='2020')";

				sPath = "/zv_bkpf";

				var that = this;
				debugger;
				this.getModel().read(encodeURI(sPath), {
					success: function(oData, response) {
						debugger;
						oViewModel.setProperty("/gjahr", oData.results[0].CompanyCode);
						
							var sPath = "/zv_bkpf(CompanyCode='1000',belnr='1000000000',gjahr='2020')";
							sPath = "/zv_bkpf";
							
							this.getModel().read(encodeURI(sPath), {
								success: function(oData, response) {
									debugger;
									
								}.bind(this),
								error: function(oError) {
									
									debugger;
								}
							});
							
						
					}.bind(this),
					error: function(oError) {
						debugger;
					}
				});

				oViewModel.setProperty("/gjahr", "666");
			});
			// Add the worklist page to the flp routing history
			this.addHistoryEntry({
				title: this.getResourceBundle().getText("worklistViewTitle"),
				icon: "sap-icon://table-view",
				intent: "#zyytt1-display"
			}, true);
		},

		_onObjectMatched: function(oEvent) {
			debugger;
			
			var cc = oEvent.getParameter("arguments");
			var sPath = "/zv_bkpf(CompanyCode='1000',belnr='1000000000',gjahr='2020')";

				sPath = "/zv_bkpf";

				var that = this;
				debugger;
				this.getModel().read(encodeURI(sPath), {
					success: this.fSuccess.bind(this),          
					error: this.fSuccess.bind(this)
				});
		},

		fSuccess: function(oEvent) {
			debugger;
			oViewModel.setProperty("/gjahr", oData.results[0].CompanyCode);

		},

		fError: function(oEvent) {
			debugger;
			oViewModel.setProperty("/gjahr", oData.results[0].CompanyCode);

		},
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function(oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress: function(oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		/**
		 * Event handler when the share in JAM button has been clicked
		 * @public
		 */
		onShareInJamPress: function() {
			var oViewModel = this.getModel("worklistView"),
				oShareDialog = sap.ui.getCore().createComponent({
					name: "sap.collaboration.components.fiori.sharing.dialog",
					settings: {
						object: {
							id: location.href,
							share: oViewModel.getProperty("/shareOnJamTitle")
						}
					}
				});
			oShareDialog.open();
		},

		onSearch: function(oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var aTableSearchState = [];
				var sQuery = oEvent.getParameter("query");

				if (sQuery && sQuery.length > 0) {
					aTableSearchState = [new Filter("blart", FilterOperator.Contains, sQuery)];
				}
				this._applySearch(aTableSearchState);
			}

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function() {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject: function(oItem) {
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("CompanyCode")
			});
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearch: function(aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		}

	});
});