/*
 * Copyright (C) 2009-2018 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.controller("cus.o2c.billplan.manage.s1.ext.controller.ObjectPageExt", {

	// Getter Method for Semantic Object Service to navigate from the Application to the SAP Transactions
	_getCrossAppNavigator: function() {
		var fgetService = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService;
		return fgetService && fgetService("CrossApplicationNavigation");
	},

	/** Initialize the Controller. */
	onInit: function() {
		var that = this;

		// have a 'copy' of the message model in the global model namespace
		this.getView().setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "messages");

		// when the Items list selection changes, some buttons need to be greyed out
		this.byId("Items::Table").getTable().attachSelectionChange(
			function() {
				that.updateItemActionButtonsState();
			}
		);
	},

	/** Initialize some stuff that requires rendering to be finished. */
	onAfterRendering: function() {
		var that = this;

		// make certain buttons hide when the plan is in edit mode
		var showOnEdit = [
			"idCopyItem",
			"idCreateItem",
			"idTerminateItem",
			"idFollowOnItem",
			"idExceptionItem",
			"idDeleteItem"
		];
		for (var i = 0; i < showOnEdit.length; i++) {
			var button = this.getView().byId(showOnEdit[i]);
			if (button) { // prevent problems caused by badly maintained showOnEdit array
				button.bindProperty("visible", {
					path: "ui>/editable"
				});
			}
		}

		// Create Item button should only be allowed for certain plan types
		var createButton = this.byId("idCreateItem");
		if (createButton) {
			createButton.bindProperty("enabled", {
				path: "ui>/editable",
				formatter: function() {
					// try to find out the currently selected Plan's status.
					// if we can't find out what the status is, enable the Create Item button
					var objectContext = that.getView().getBindingContext();
					if (typeof objectContext === "undefined") {
						return true;
					}
					var curObject = objectContext.getModel().getData(objectContext.sPath);
					if (typeof curObject === "undefined") {
						return true;
					}

					// depending on the plan status, dis-/enable the Create Item button
					if (curObject.CABillgPlnStatus === "X" || curObject.CABillgPlnStatus === "F") {
						return false;
					} else {
						return true;
					}
				}
			});
		}

		// make the radio select button in this table only show when we're in edit mode
		this.byId("Items::Table").getTable().bindProperty("mode", {
			path: "ui>/editable",
			formatter: function(prop) {
				return prop ? "SingleSelectLeft" : "None";
			}
		});

		// always hide the radio select buttons in this table,
		// because there are no actions on the table anyway.
		// there are two equally shifty possibilities to achieve that:
		// 1) this only works as long as the SmartTable around the inner table
		//    actually uses the setMode() method of the inner table
		// this.byId("BillableItems::Table").getTable().setMode = function() {};
		// 2) this only works if the property binding gets precedence
		//    (or an earlier timing) over the setMode() call to the inner table
		this.byId("BillableItems::Table").getTable().bindProperty("mode", {
			path: "ui>/editable",
			formatter: function(prop) {
				return "None"; // always "None"
			}
		});

		// same as above, for another table
		this.byId("Reference::Table").getTable().bindProperty("mode", {
			path: "ui>/editable",
			formatter: function(prop) {
				return "None"; // always "None"
			}
		});

		// inject a button for Message Handling into the footer toolbar
		this.createMessagePopover();

		// every time something is sent to the backend
		this.getView().getModel().attachBatchRequestSent(
			function() {
				// empty the MessageModel
				sap.ui.getCore().getMessageManager().removeAllMessages();

				// close the MessagePopover
				that.oMessagePopover.close();

				// hide the message button
				that.oBtnMsgPopover.setVisible(false);
			}
		);

		// upon every completed batch, recheck the action buttons in the Items table
		this.getView().getModel().attachBatchRequestCompleted(
			function() {
				that.updateItemActionButtonsState();
			}
		);
	},

	/** Handle the action buttons states on Item level. */
	updateItemActionButtonsState: function() {
		var createButton = this.byId("idCreateItem");
		var copyButton = this.byId("idCopyItem");
		var terminateButton = this.byId("idTerminateItem");
		var followOnItemButton = this.byId("idFollowOnItem");
		var exceptionButton = this.byId("idExceptionItem");
		var deleteButton = this.byId("idDeleteItem");
		var buttons = [ // collect all buttons here for later NOT operation
			createButton,
			copyButton,
			terminateButton,
			followOnItemButton,
			exceptionButton,
			deleteButton
		];

		// get the currently selected Item
		var itemContext = this.byId("Items::Table").getTable().getSelectedContexts()[0]; // table is supposed to only allow one item to be selected
		// if there is no item selected, don't do anything
		if (typeof itemContext === "undefined") {
			return;
		}
		var curItem = itemContext.getModel().getData(itemContext.sPath);

		// if there is no context for the selected item anymore (e.g. if the item was deleted just now)
		if (typeof curItem === "undefined") {
			return;
		}

		// get the currently selected Billing Plan
		var objectContext = this.getView().getBindingContext();
		var curObject = objectContext.getModel().getData(objectContext.sPath);

		// a place to store which button to enable
		var allowedButtons = [];

		// what state is the billing plan in?
		switch (curObject.CABillgPlnStatus) {

			case "": // New
			case "O": // In Processing
				allowedButtons = [
					createButton,
					exceptionButton,
					deleteButton,
					copyButton
				];
				break;

			case "R": // Released

				switch (curItem.CABillgPlnItemStatus) {
					case "": // New
						allowedButtons = [
							createButton,
							exceptionButton,
							deleteButton,
							copyButton
						];
						break;

					case "O": // In Processing
					case "R": // Released
						allowedButtons = [
							createButton,
							exceptionButton,
							terminateButton,
							followOnItemButton
						];
						break;

					case "F": // Finished
					default:
						allowedButtons = [];
						break;
				}
				break;

			case "X": // Discarded
			case "F": // Completed
			default:
				allowedButtons = [];
				break;
		}

		// if this is an Exception
		if (curItem.CABillgPlnItmCat === "BIP02") {
			// don't allow the Exception button
			var idx = allowedButtons.indexOf(exceptionButton);
			if (idx > -1) {
				allowedButtons.splice(idx, idx);
			}
		}

		// actually set the button states
		var forbiddenButtons = $(buttons).not(allowedButtons).get(); // all the buttons that are not allowed
		for (var i = 0; i < allowedButtons.length; i++) {
			// if we actually have a reference to that button
			if (!(typeof allowedButtons[i] === "undefined")) {
				allowedButtons[i].setProperty("enabled", true);
			}
		}
		for (var i = 0; i < forbiddenButtons.length; i++) {
			// if we actually have a reference to that button
			if (!(typeof forbiddenButtons[i] === "undefined")) {
				forbiddenButtons[i].setProperty("enabled", false);
			}
		}
	},

	/**
	 * Handle clicks on the Create button.
	 * @param {Event} oEvent - The click event.
	 */
	onCreateItemPress: function(oEvent) {
		var that = this;
		var fragPath = "cus.o2c.billplan.manage.s1.ext.fragments.CreateBillingPlanItem";
		var oModel = this.getView().getModel();
		var sPath = this.getView().getBindingContext().getPath() + "/to_CABillgPlnItem";
		var oExtensionAPI = this.extensionAPI;
		var i18n = this.getView().getModel("i18n").getResourceBundle();

		// prevent multi-clicks on the button by setting the view to busy
		var d = this.getView().getBusyIndicatorDelay();
		this.getView().setBusyIndicatorDelay(0).setBusy(true).setBusyIndicatorDelay(d);

		// success callback function for item creation request
		var success = function(aResponse) {

			// lift the lock from the app because we will open the dialog fragment any time now
			that.getView().setBusy(false);

			if (!aResponse) {
				return;
			}

			// create a context from the response
			var oContext = new sap.ui.model.Context(oModel, aResponse.context.sPath);

			var _oDialog = sap.ui.xmlfragment(that.getView().getId(), fragPath, {
				onCreatePress: function(e) {
					// check if the PlanType field contains a valid value
					var field = that.getView().byId("idFieldItemType");
					var value = field.getValue(); // getValue() is supposed to always return a string

					// if there is no content in the field
					if (!value.length) {
						field.setValueState("Error");
						return;
					}

					// prevent multi-clicks
					_oDialog.setBusyIndicatorDelay(0).setBusy(true);

					// check input field value for validity
					oModel.read("/I_CABillgPlnItmType", {
						filters: [new sap.ui.model.Filter("CABillgPlnItmType", sap.ui.model.FilterOperator.EQ, value)],
						success: function(oData, response) {
							// if there is no value in the backend equal to the input value
							if (oData.results.length !== 1) {
								field.setValueState("Error");
								field.setValueStateText(i18n.getText("unknownItemType"));

								// remove the busy state from the dialog
								_oDialog.setBusy(false);
								return;
							}
							// else the input value exists in the backend

							// update the tables
							oModel.refresh(true);

							// close the dialog
							_oDialog.close();

							// take care of potential messages
							that._handleMessageButton(that);
						},
						error: function(oError) {
							// couldn't check for validity

							// remove the busy state on the button
							_oDialog.setBusy(false);

							// take care of potential messages
							that._handleMessageButton(that);
						}
					});

				},

				onCancelPress: function(e) {
					// abandon all changes
					oModel.remove(
						"", {
							context: oContext, //aResponse.context,
							success: function() {
								// refresh the table (aka remove the deleted entry)
								oModel.refresh(true);

								// close this dialog
								_oDialog.close();

								// take care of potential messages
								that._handleMessageButton(that);
							},
							error: function() {
								// take care of potential messages
								that._handleMessageButton(that);
							}
						}
					);
				},

				afterClose: function() {
					// due to program structure we need to destroy the dialog,
					// otherwise the context will stay the same
					_oDialog.destroy();
				}
			});
			// bind the model to the dialog
			_oDialog.setBindingContext(oContext); //aResponse.context);

			// show the dialog
			oExtensionAPI.attachToView(_oDialog);
			_oDialog.open();

			// update the model so the lists are up to date
			oModel.refresh(true);

			// take care of potential messages
			that._handleMessageButton(that);
		};

		// prepare an error handler for item creation request
		var error = function(oError) {
			that.getView().setBusy(false);

			// take care of potential messages
			that._handleMessageButton(that);
		};

		// prepare a draft controller
		var oDraftController = new sap.ui.generic.app.transaction.DraftController(oModel);

		// actually make the request
		oDraftController.createNewDraftEntity(sPath, sPath).then(success).catch(error);
	},

	/** Handle the click event on the Copy button. */
	onCopyItemPress: function() {
		this._manageItem("C_CABillgPlnItemCopy");
	},

	/** Handle the click event on the Terminate button. */
	onTerminateItemPress: function() {
		this._manageItem("C_CABillgPlnItemTerminate");
	},

	/** Handle the click event on the Follow on Item button. */
	onFollowOnItemPress: function() {
		this._manageItem("C_CABillgPlnItemFollowonitem");
	},

	/**
	 *  Central function for Copy, Terminate and FollowOnItem actions, as
	 *  they all have the same url query with only a different sPath.
	 * 
	 *  @param {String} sPath - the path to which the request will be sent
	 */
	_manageItem: function(sPath) {
		var that = this;
		var oModel = this.getView().getModel();
		var context = this.byId("Items::Table").getTable().getSelectedContexts()[0]; // table is supposed to only allow one item to be selected
		var entry = context.getModel().getData(context.sPath);

		oModel.createEntry(
			sPath, {
				urlParameters: {
					"CABillgPlnNumber": "'" + entry.CABillgPlnNumber.toString() + "'",
					"CABillgPlnItem": "'" + entry.CABillgPlnItem.toString() + "'",
					"DraftUUID": "guid'" + entry.DraftUUID + "'",
					"IsActiveEntity": entry.IsActiveEntity
				},
				success: function(response) {
					// update the items list
					oModel.refresh(true);

					// take care of potential messages			            
					that._handleMessageButton(that);
				},
				error: function(response) {
					// take care of potential messages			            
					that._handleMessageButton(that);
				}
			}
		);
		oModel.submitChanges();
	},

	/**
	 * Handle the click event on the Exception button.
	 * 
	 * @param {Event} oEvent - the click event
	 */
	onExceptionItemPress: function(oEvent) {
		var that = this;
		var oModel = this.getView().getModel();
		var context = this.byId("Items::Table").getTable().getSelectedContexts()[0]; // table is supposed to only allow one item to be selected
		var entry = context.getModel().getData(context.sPath);

		oModel.createEntry(
			"C_CABillgPlnItemException", {
				urlParameters: {
					"CABillgPlnNumber": "'" + entry.CABillgPlnNumber.toString() + "'",
					"CABillgPlnItem": "'" + entry.CABillgPlnItem.toString() + "'",
					"DraftUUID": "guid'" + entry.DraftUUID + "'",
					"IsActiveEntity": entry.IsActiveEntity
				},
				success: function(response) {
					// update the items list
					oModel.refresh(true);

					// take care of potential messages
					that._handleMessageButton(that);
				},
				error: function(response) {
					// take care of potential messages
					that._handleMessageButton(that);
				}
			}
		);
		oModel.submitChanges();
	},

	/**
	 * Handle the click event on the Delete button.
	 * 
	 * @param {Event} oEvent - the click event
	 */
	onDeleteItemPress: function(oEvent) {
		var that = this;
		var oModel = this.getView().getModel();
		var context = this.byId("Items::Table").getTable().getSelectedContexts()[0]; // table is supposed to only allow one item to be selected

		// callback function for successful request
		var success = function() {
			oModel.refresh(true);

			// take care of potential messages
			that._handleMessageButton(that);
		};

		// callback function for failed request
		var error = function() {
			// take care of potential messages
			that._handleMessageButton(that);
		};

		// remove that item from the model
		oModel.remove(
			context.sPath, {
				context: context,
				success: success,
				error: error
			}
		);
	},

	onClickBIT: function(oEvent) {

		// get the Service for the Semantic Object and Data for the Parameters
		var oContext = oEvent.getSource().getBindingContext();
		var oCrossAppNavigator = this._getCrossAppNavigator();

		// Variable with fixed structure needed for the Semantic Object Call. At "target" you reference the Semantic 
		// Object and the Action implementation

		var hrefForGUIDisplay1;

		// nothing selected => goto BIT Display app and transmit only master data 
		if (oEvent.getSource().getParent().getParent().getTable().getSelectedContexts().length === 0) {
			hrefForGUIDisplay1 = oCrossAppNavigator.hrefForExternal({
				target: {
					semanticObject: "BillableItem",
					action: "display"
				},
				params: {
					GPART: oContext.getObject().BusinessPartner,
					VKONT: oContext.getObject().ContractAccount
				}
			});

			// Billable Item selected => goto BIT Display app for a given Billable Item 			
		} else {
			var sPath = oEvent.getSource().getParent().getParent().getTable().getSelectedContexts()[0].getPath();
			var sSourceTransID = oEvent.getSource().getModel().getProperty(sPath + "/SRCTAID");
			var sBitpackUUID = oEvent.getSource().getModel().getProperty(sPath + "/BITPACKUUID");
			var sBitpackNumber = oEvent.getSource().getModel().getProperty(sPath + "/BITPACKCNO");

			hrefForGUIDisplay1 = oCrossAppNavigator.hrefForExternal({
				target: {
					semanticObject: "BillableItem",
					action: "display"
				},
				params: {
					GPART: oContext.getObject().BusinessPartner,
					VKONT: oContext.getObject().ContractAccount,
					SRCTAID: sSourceTransID,
					BITPACKUUID: sBitpackUUID,
					BITPACKCNO: sBitpackNumber
				}
			});
		}

		// Calling the Semantic Object with the corresponding Service and the Variable for the Parameters
		oCrossAppNavigator.toExternal({
			target: {
				shellHash: hrefForGUIDisplay1
			}
		});
	},

	/**	Add the button for opening MessagePopover to the toolbar. */
	createMessagePopover: function() {
		var that = this;

		// create a new MessagePopover
		this.oMessagePopover = new sap.m.MessagePopover({
			items: {
				path: "messages>/",
				template: new sap.m.MessagePopoverItem({
					description: "{messages>description}",
					type: "{messages>type}",
					title: "{messages>message}"
				})
			}
		});
		this.extensionAPI.attachToView(this.oMessagePopover);

		// inject a button into the footer that will toggle the MessagePopover
		this.oFooter = this.getView().byId("template::ObjectPage::FooterToolbar");
		this.oBtnMsgPopover = new sap.m.Button({
			icon: "sap-icon://message-popup",
			type: "Emphasized"
		});
		this.oFooter.insertContent(this.oBtnMsgPopover, 0);

		// show the amount of the accumulated messages on the button
		this.oBtnMsgPopover.bindProperty("text", {
			path: "messages>/",
			formatter: function(prop) {
				return prop.length ? prop.length.toString() : "";
			}
		});

		// hide the button from the start
		this.oBtnMsgPopover.setVisible(false);

		// as soon as the button renders
		this.oBtnMsgPopover.addEventDelegate({
			onAfterRendering: function() {
				// check if we need to open the MessagePopover
				that._handleMessagePopover(that);
			}
		});

		// toggle the MessagePopover on button press
		this.oBtnMsgPopover.attachPress(function(e) {
			that.oMessagePopover.toggle(e.getSource());
		});
	},

	/** Remove duplicate messages from the MessageModel.
	 *  THIS IS A WORKAROUND for a framework bug. Short explanation: When we send a batch and
	 *  one of the (early) request fails, somehow the error message for that automagically ends up as
	 *  the error message for the following requests as well. The MessagePopover will then show the
	 *  same message multiple times.
	 *  This is probably caused by the fact that the backend, after the first failure, does not handle
	 *  any of the other requests anymore and also doesn't send any responses for them.
	 */
	_removeDuplicateMessages: function() {
		// get a copy of the MessageModel data
		var aMessages = sap.ui.getCore().getMessageManager().getMessageModel().getData();

		var uniqMessages = [];
		for (var i = 0; i < aMessages.length; i++) {

			// if we haven't seen this message yet
			if (uniqMessages.indexOf(aMessages[i].message) < 0) {
				// remember that we have seen this message now
				uniqMessages.push(aMessages[i].message);

				// else we already have seen this message
			} else {
				// remove it from the MessageModel
				sap.ui.getCore().getMessageManager().removeMessages([aMessages[i]]);
			}
		}
	},

	/** Make the message popover visible if there is an Error Message in the Message Model.
	 * 
	 * @param {object} controller - a reference to the controller
	 */
	_handleMessageButton: function(controller) {
		// WORKAROUND: remove duplicate messages
		this._removeDuplicateMessages();

		// if there are messages in the MessageModel
		if (sap.ui.getCore().getMessageManager().getMessageModel().getData().length) {
			// show the Message Button
			this.oBtnMsgPopover.setVisible(true);

			// else there are no messages in the MessageModel
		} else {
			// if the MessageButton (already) exists
			if (!(typeof this.oBtnMsgPopover === "undefined")) {
				// hide the Message Button
				this.oBtnMsgPopover.setVisible(false);
			}
		}
	},

	/** Check whether to open the MessagePopover.
	 * 
	 * @param {object} controller - a reference to the controller
	 */
	_handleMessagePopover: function(controller) {
		var aMessages = sap.ui.getCore().getMessageManager().getMessageModel().getData();

		// for all Messages in the MessageModel
		for (var i = 0; i < aMessages.length; i++) {

			// if the current Message is an Error Message
			if (aMessages[i].type === "Error") {
				// open the MessagePopover
				controller.oMessagePopover.openBy(controller.oBtnMsgPopover);

				// rest of the messages don't matter, we already know that we need the MessagePopup
				return;
			}
		}
	}
});