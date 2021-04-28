/*
 * Copyright (C) 2009-2018 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.controller("cus.o2c.billplan.manage.s1.ext.controller.ListReportExt", {
	/** Initialize the Controller. */
	onInit: function() {
		var that = this;

		// global indicator of whether the footer bar is currently in an animation
		this.footerAnimated = false;

		// build model for buttons
		var oButtonModel = new sap.ui.model.json.JSONModel({
			"release-enable": false,
			"discard-enable": false,
			"delete-enable": false,
			"complete-enable": false,
			"reopen-enable": false
		});
		this.getView().setModel(oButtonModel, "buttonTargets");

		// unbind actionbuttons from generic model
		this.getView().byId("idReleasePlan").unbindProperty("enabled", true);
		this.getView().byId("idReleasePlan").bindProperty("enabled", "buttonTargets>/release-enable");

		this.getView().byId("idDiscardPlan").unbindProperty("enabled", true);
		this.getView().byId("idDiscardPlan").bindProperty("enabled", "buttonTargets>/discard-enable");

		this.getView().byId("idDeletePlan").unbindProperty("enabled", true);
		this.getView().byId("idDeletePlan").bindProperty("enabled", "buttonTargets>/delete-enable");

		this.getView().byId("idCompletePlan").unbindProperty("enabled", true);
		this.getView().byId("idCompletePlan").bindProperty("enabled", "buttonTargets>/complete-enable");

		this.getView().byId("idReopenPlan").unbindProperty("enabled", true);
		this.getView().byId("idReopenPlan").bindProperty("enabled", "buttonTargets>/reopen-enable");

		// hide draft framework action for 'Create' and 'Delete' entry
		var hiddenButtons = [
			"addEntry",
			"deleteEntry"
		];
		for (var i = 0; i < hiddenButtons.length; i++) {
			this.byId(hiddenButtons[i]).setVisible(false);
		}

		// when the list report selection changes, some buttons need to be greyed out
		this.getView().byId("listReport").getTable().attachSelectionChange(
			function() {
				that.updateCopyAndSimulateButtonState();
				that.updateFunctionButtonsState();
			}
		);

		// ignore the following fields from the table personalisation
		var ignoreFields = [
			"CABillgPlnCreatedByUser",
			"CABillgPlnChangedByUser",
			"CABillgPlnTypeDisplay"
		];
		this.getView().byId("listReport").setIgnoreFromPersonalisation(ignoreFields.join(","));

		// have a 'copy' of the message model in the global model namespace
		this.getView().setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "messages");
	},

	/** Initialize some stuff that requires rendering to be finished. */
	onAfterRendering: function() {
		var that = this;

		this.getView().getModel().attachBatchRequestCompleted(
			function() {
				// after we changed a plan's state, we need to update the action buttons
				// accordingly, because the currently selected plan(s) will have changed states
				that.updateFunctionButtonsState();
			}
		);

		// every time something is sent to the backend
		this.getView().getModel().attachBatchRequestSent(
			function() {
				// empty the MessageModel
				sap.ui.getCore().getMessageManager().removeAllMessages();

				// close the MessagePopover
				that.oMessagePopover.close();

				// set up a periodic check whether to remove the footer bar
				var intervalID = setInterval(
					function() {
						var oModel = that.getView().getModel();
						var messages = sap.ui.getCore().getMessageManager().getMessageModel().getData();

						// if there are no pending requests and there are no messages in the model
						if (!oModel.hasPendingRequests() && !messages.length) {

							// hide the footer
							var oPage = that.getView().byId("page");
							oPage.setShowFooter(false);

							// clear the periodic interval
							clearInterval(intervalID);

							// else there are no pending requests but there are messages in the model
						} else if (!oModel.hasPendingRequests() && messages.length) {
							// do not close the footer bar, but delete this interval so we don't accumulate
							// too many intervals in case an error is returned again and again.
							// a new interval check will be started with a new request.
							clearInterval(intervalID);
						}
					},
					200
				);
			}
		);

		// inject a button for Message Handling into the footer toolbar
		this.createMessagePopover();
	},

	/**
	 * Update the status of the function buttons, currently 'Discard',
	 * 'Release' and 'Delete', depending on the selected items.
	 */
	updateFunctionButtonsState: function() {

		var oButtonModel = this.getView().getModel("buttonTargets");
		var selected = this.extensionAPI.getSelectedContexts();

		/**
		 * Actually update the buttons to reflect a given state.
		 * @param {String} state - the state to which adjust the buttons
		 */
		var updateButtons = function(state) {
			switch (state) {
				case "": // New 
					oButtonModel.setProperty("/release-enable", false);
					oButtonModel.setProperty("/discard-enable", false);
					oButtonModel.setProperty("/delete-enable", false);
					oButtonModel.setProperty("/complete-enable", false);
					oButtonModel.setProperty("/reopen-enable", false);
					break;
				case "O": // In Processing
					oButtonModel.setProperty("/release-enable", true);
					oButtonModel.setProperty("/discard-enable", true);
					oButtonModel.setProperty("/delete-enable", true);
					oButtonModel.setProperty("/complete-enable", false);
					oButtonModel.setProperty("/reopen-enable", false);
					break;
				case "R": // Released
					oButtonModel.setProperty("/release-enable", false);
					oButtonModel.setProperty("/discard-enable", true);
					oButtonModel.setProperty("/delete-enable", false);
					oButtonModel.setProperty("/complete-enable", true);
					oButtonModel.setProperty("/reopen-enable", false);
					break;
				case "X": // Discarded
					oButtonModel.setProperty("/release-enable", false);
					oButtonModel.setProperty("/discard-enable", false);
					oButtonModel.setProperty("/delete-enable", true);
					oButtonModel.setProperty("/complete-enable", false);
					oButtonModel.setProperty("/reopen-enable", false);
					break;
				case "F": // Completed
					oButtonModel.setProperty("/release-enable", false);
					oButtonModel.setProperty("/discard-enable", false);
					oButtonModel.setProperty("/delete-enable", true);
					oButtonModel.setProperty("/complete-enable", false);
					oButtonModel.setProperty("/reopen-enable", true);
					break;
				default: // do nothing
					break;
			}
		};

		/**
		 * Helper function to remove duplicates from an array. This will not
		 * keep track of the sorting order of the initial array.
		 * 
		 *  @param {Array} a - The array from which to remove duplicates
		 *  @return {Array} - an array without duplicates
		 */
		var uniq = function(a) {
			var seen = {};
			return a.filter(function(item) {
				return seen.hasOwnProperty(item) ? false : (seen[item] = true);
			});
		};

		// if there is only one plan selected
		if (selected.length === 1) {
			var HasActiveEntity = selected[0].getProperty("HasActiveEntity");
			var HasDraftEntity = selected[0].getProperty("HasDraftEntity");
			// if this plan is not in draft mode
			if (!HasActiveEntity && !HasDraftEntity) {
				// update the buttons accordingly to that plan's status
				updateButtons(selected[0].getProperty("CABillgPlnStatus"));

				// else this plan is in draft mode
			} else {
				// if this is a completed plan (but somehow ended up in draft mode,
				// e.g. by someone modifying the database through a different client)
				if (selected[0].getProperty("CABillgPlnStatus") === "F") {
					// treat this as a completed plan and ignore draft mode
					updateButtons("F");

					// else this is not a completed plan
				} else {
					// deactivate the 'Discard', 'Release' and 'Delete' action buttons (abusing the New ("") state)
					updateButtons("");
				}
			}

			// else if there is more than 1 plan selected
		} else if (selected.length > 1) {

			// for all selected plans
			for (var i = 0; i < selected.length; i++) {
				var HasActiveEntity = selected[i].getProperty("HasActiveEntity");
				var HasDraftEntity = selected[i].getProperty("HasDraftEntity");

				// if the current plan is in draft mode
				if (HasActiveEntity || HasDraftEntity) {

					// if the plan is a completed plan in draft mode
					if (selected[i].getProperty("CABillgPlnStatus") === "F") {

						// ignore that - completed plans that are drafts should be treated as if not a draft
						continue;
					}

					// deactivate the 'Discard', 'Release' and 'Delete' action buttons (abusing the New ("") state)
					updateButtons("");
					return;
				}
			}
			// none of the selected entries are in draft mode

			// get the unique states from the selected entries
			var states = [];
			for (i = 0; i < selected.length; i++) {
				states.push(selected[i].getProperty("CABillgPlnStatus"));
			}
			states = uniq(states);

			// if there are only plans with the same state selected
			if (states.length === 1) {
				// update the buttons according to that state
				updateButtons(states[0]);

				// else there is more than 1 unique state selected
			} else {
				// deactivate the 'Discard', 'Release' and 'Delete' action buttons (abusing the New ("") state)
				updateButtons("");
			}

			// else there are no plans selected
		} else {
			// do nothing as this is handled by the extension definitions in manifest.json
			updateButtons("");
		}
	},

	/**
	 *  Update the status of the copy and simulate buttons depending on
	 *  the amount of selected entries in the List Report.
	 */
	updateCopyAndSimulateButtonState: function() {
		var buttons = [
			this.getView().byId("idCopyPlan"),
			this.getView().byId("idSimulatePlan")
		];
		for (var i = 0; i < buttons.length; i++) {

			// if the button exists
			if (typeof buttons[i] !== "undefined") {

				// if there is exactly one item selected
				if (this.extensionAPI.getSelectedContexts().length === 1) {
					// enable the button
					buttons[i].setProperty("enabled", true);

					// else there are zero or more than one item selected
				} else {
					// disable the button
					buttons[i].setProperty("enabled", false);
				}
			}
		}
	},

	/**
	 * Handle clicks on the Create button.
	 * @param {Event} oEvent - The click event.
	 */
	onCreatePlanPress: function(oEvent) {
		var that = this;
		var fragPath = "cus.o2c.billplan.manage.s1.ext.fragments.CreateBillingPlan";
		var oModel = this.getView().getModel();
		var sPath = "C_CABillgPln";
		var oExtensionAPI = this.extensionAPI;
		var i18n = this.getView().getModel("i18n").getResourceBundle();

		// prevent multi-clicks on the button by setting the view to busy
		var d = this.getView().getBusyIndicatorDelay();
		this.getView().setBusyIndicatorDelay(0).setBusy(true).setBusyIndicatorDelay(d);

		// prepare a success handler for plan creation request
		var success = function(aResponse) {

			// lift the lock from the app because we will open the dialog fragment any time now
			that.getView().setBusy(false);

			if (!aResponse) {
				return;
			}

			// create a context from the response
			var oContext = new sap.ui.model.Context(oModel, aResponse.context.sPath);

			// create a dialog
			var _oDialog = sap.ui.xmlfragment(that.getView().getId(), fragPath, {
				onCreatePress: function(e) {

					// check if the PlanType field contains a valid value
					var field = that.getView().byId("idFieldPlanType");
					var value = field.getValue(); // getValue() is supposed to always return a string

					// if there is no content in the field
					if (!value.length) {
						field.setValueState("Error");
						return;
					}

					// prevent multi-clicks
					_oDialog.setBusyIndicatorDelay(0).setBusy(true);

					// check input field value for validity
					oModel.read("/I_CABillgPlnTypeEditable", {
						filters: [new sap.ui.model.Filter("CABillgPlnType", sap.ui.model.FilterOperator.EQ, value)],
						success: function(oData, response) {
							// if there is no value in the backend equal to the input value
							if (oData.results.length !== 1) {
								field.setValueState("Error");
								field.setValueStateText(i18n.getText("unknownPlanType"));

								// remove the busy state from the dialog
								_oDialog.setBusy(false);
								return;
							}
							// else the input value exists in the backend

							// navigate to the draft object page
							oExtensionAPI.getNavigationController().navigateInternal(oContext);
						},
						error: function(oError) {
							// couldn't check for validity

							// remove the busy state on the button
							_oDialog.setBusy(false);
						}
					});
				},

				onCancelPress: function() {
					// abandon all changes
					oModel.remove(
						"", {
							context: oContext,
							success: function() {
								// refresh the table (aka remove the deleted entry)
								oModel.refresh(true);

								// close this dialog
								_oDialog.close();
							}
						}
					);
					// close this dialog
					_oDialog.close();
				},

				afterClose: function() {
					// due to program structure we need to destroy the dialog,
					// otherwise the context will stay the same
					_oDialog.destroy();
				}
			});

			// bind the new context to the dialog and allow editing
			_oDialog.setBindingContext(oContext);

			// show the dialog
			oExtensionAPI.attachToView(_oDialog);
			_oDialog.open();

			// update the model so the list report is up to date
			oModel.refresh(true);

		};
		// prepare an error handler for plan creation request
		var error = function(oError) {
			that.getView.setBusy(false);
			that._handleMessagePopover(that);
		};

		// prepare a draft controller
		var oDraftController = new sap.ui.generic.app.transaction.DraftController(oModel);

		// actually make the request
		oDraftController.createNewDraftEntity(sPath, sPath).then(success).catch(error);
	},

	/**
	 * Handle clicks on the Copy button.
	 * 
	 * @param {Event} oEvent - The click event.
	 */
	onCopyPlanPress: function(oEvent) {
		var that = this;
		var oModel = this.getView().getModel();
		var sPath = "/C_CABillgPln";
		var oExtensionAPI = this.extensionAPI;

		var newPlan = oModel.createEntry(
			sPath, {
				properties: {
					// Copy button should only be enabled if there is exactly 1 plan selected, so
					// we can access this one plan directly without further checking for selections
					"CABillgPlnNumberRef": oModel.getProperty("CABillgPlnNumber", this.extensionAPI.getSelectedContexts()[0])
				},
				success: function() {
					// refresh the table so it is up-to-date when we return to the list report
					oModel.refresh(true);

					// navigate to the newly created copied entity
					oExtensionAPI.getNavigationController().navigateInternal(newPlan);
				},
				error: function() {
					that._handleMessagePopover(that);
				}
			}
		);
	},

	/**
	 * Handle the click event on the Discard button.
	 * 
	 * @param {Event} oEvent - The click event.
	 */
	onDiscardPlanPress: function(oEvent) {
		this._executeOneClickFunction("/C_CABillgPlnDiscard", oEvent.getSource());
	},

	/**
	 * Handle the click event on the Release button.
	 * 
	 * @param {Event} oEvent - The click event.
	 */
	onReleasePlanPress: function(oEvent) {
		this._executeOneClickFunction("/C_CABillgPlnRelease", oEvent.getSource());
	},

	onCompletePlanPress: function(oEvent) {
		this._executeOneClickFunction("/C_CABillgPlnComplete", oEvent.getSource());
	},

	onReopenPlanPress: function(oEvent) {
		this._executeOneClickFunction("/C_CABillgPlnReopen", oEvent.getSource());
	},

	/**
	 * Internal handler for the click events on the Discard and Release buttons.
	 * 
	 * @param {string} sPath - the target path for the request
	 * @param {Control} busyButton - the button to set the busy state on during the request
	 */
	_executeOneClickFunction: function(sPath, busyButton) {
		var that = this;

		var oModel = this.getView().getModel();
		var selected = this.extensionAPI.getSelectedContexts();

		// prevent multi-clicks
		busyButton.setBusyIndicatorDelay(0).setBusy(true);

		// callback function for successful request
		var success = function() {
			busyButton.setBusy(false);
			oModel.refresh(true);
			that._handleMessagePopover(that);
		};

		// callback function for failed request
		var error = function() {
			busyButton.setBusy(false);
			that._handleMessagePopover(that);
		};

		// for all selected items
		for (var i = 0; i < selected.length; i++) {
			// invoke the action that was pressed on the current item
			this.extensionAPI.invokeActions(sPath, selected[i]).then(success).catch(error);
		}
	},

	/**
	 * Handle the click event on the Delete button.
	 * 
	 * @param {Event} oEvent - the click event
	 */
	onDeletePlanPress: function(oEvent) {
		var that = this;
		var oModel = this.getView().getModel();
		var selected = this.extensionAPI.getSelectedContexts();

		// callback function for successful request
		var success = function() {
			oModel.refresh(true);
			that._handleMessagePopover(that);
		};

		// callback function for failed request
		var error = function() {
			that._handleMessagePopover(that);
		};

		// for all selected items
		for (var i = 0; i < selected.length; i++) {

			// remove that item from the model
			oModel.remove(
				selected[i].sPath, {
					context: selected[i],
					success: success,
					error: error
				}
			);
		}
	},

	onSimulatePlanPress: function(oEvent) {
		var that = this;
		var fragPath = "cus.o2c.billplan.manage.s1.ext.fragments.SimulateBillingPlan";
		var oModel = this.getView().getModel();
		var oExtensionAPI = this.extensionAPI;
		var i18n = this.getView().getModel("i18n").getResourceBundle();

		var contexts = this.extensionAPI.getSelectedContexts();

		// we only do this for single plans
		if (contexts.length !== 1) {
			return;
		}

		// prevent multi-clicks on the button by setting the view to busy
		var d = this.getView().getBusyIndicatorDelay();
		this.getView().setBusyIndicatorDelay(0).setBusy(true).setBusyIndicatorDelay(d);

		// success handler for plan simulation request
		var success = function(aResponse) {

			// lift the lock from the app because we will open the dialog fragment any time now
			that.getView().setBusy(false);

			if (!aResponse) {
				return;
			}

			// create a (recursive) object to be used in the Tree
			var resultset = aResponse["0"].response.data.results;
			var o = {};
			$.each(resultset, function(k, v) {
				// construct a text to be shown in the Tree
				v.text = i18n.getText("treeItemText") + " " + parseInt(v.Billplanitem, 10) + " - " + v.BitAmount + " " + v.BitCurr;

				// remove fields that confuse the Tree (i.e. any object or array)
				delete v.__metadata;
				var billFirst = v.BillFirst;
				delete v.BillFirst;

				if (o.hasOwnProperty(v.BillFirst)) {
					o[billFirst].items.push(v);
				} else {
					o[billFirst] = {
						"nodes": [v],
						"text": billFirst.toLocaleDateString()
					};
				}
			});

			// create a dialog
			var _oDialog = sap.ui.xmlfragment(that.getView().getId(), fragPath, {
				onCreatePress: function(e) {},

				onCancelPress: function(e) {
					_oDialog.close();
				},

				afterClose: function(e) {
					_oDialog.destroy();
				}
			});

			o = $.map(o, function(v, k) {
				return v;
			});

			// calculate the sum of the items
			for (var i = 0; i < o.length; i++) {
				var sum = 0;
				var curr = o[i].nodes[0].BitCurr; // we expect all items to use the same currency
				for (var j = 0; j < o[i].nodes.length; j++) {
					sum = sum + parseFloat(o[i].nodes[j].BitAmount, 10);
				}
				o[i].text = o[i].text + " - " + sum + " " + curr;
			}
			// bind the model to the dialog
			that.getView().setModel(new sap.ui.model.json.JSONModel(o), "SIM");

			// show the dialog
			oExtensionAPI.attachToView(_oDialog);
			_oDialog.open();
		};

		var entry = contexts[0].getModel().getData(contexts[0].sPath);

		// callback function for failed request
		var error = function() {
			that._handleMessagePopover(that);
		};

		var params = {
			CABillgPlnNumber: entry.CABillgPlnNumber,
			BusinessPartner: entry.BusinessPartner,
			ContractAccount: entry.ContractAccount
		};

		// invoke the action that was pressed on the current item
		this.extensionAPI.invokeActions(
			"/BillgPlnSimulate",
			contexts[0],
			params
		).then(success).catch(error);

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
		this.oFooter = this.getView().byId("page").getFooter();
		this.oBtnMsgPopover = new sap.m.Button({
			icon: "sap-icon://message-popup",
			type: "Emphasized"
		});
		this.oFooter.insertContent(this.oBtnMsgPopover, 0);

		// show the amount of the accumulated messages on the button.
		// this leads to minor rendering bugs with the footer bar.
		this.oBtnMsgPopover.bindProperty("text", {
			path: "messages>/",
			formatter: function(prop) {
				return prop.length ? prop.length.toString() : "";
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

	/**
	 * Make the message popover visible if there is an Error Message in the Message Model.
	 * @param {object} controller - a reference to the controller
	 */
	_handleMessagePopover: function(controller) {

		// WORKAROUND remove duplicate messages
		this._removeDuplicateMessages();

		// get a copy of the (now duplicate-stripped) MessageModel data
		var aMessages = sap.ui.getCore().getMessageManager().getMessageModel().getData();

		// for all Messages in the MessageModel
		for (var i = 0; i < aMessages.length; i++) {

			// if the current Message is an Error Message
			if (aMessages[i].type === "Error") {

				// show the footer bar if it isn't already showing
				var oPage = controller.getView().byId("page");
				if (!oPage.getShowFooter()) {
					oPage.setShowFooter(true);
					controller.footerAnimated = true;

					// open the MessagePopover AFTER A TIMEOUT because the footer bar
					// will move its position upon the first time opening, which causes problem
					// with the rendering of the MessagePopover, causing it to close.
					setTimeout(
						function() {
							controller.oMessagePopover.openBy(controller.oBtnMsgPopover);
							controller.footerAnimated = false;
						},
						sap.f.DynamicPage.FOOTER_ANIMATION_DURATION
					);
					return;
				}

				// if the footer is not currently animated
				if (!controller.footerAnimated) {
					// open the MessagePopover
					controller.oMessagePopover.openBy(controller.oBtnMsgPopover);
				}

				// rest of the messages don't matter, we already know that we need the MessagePopup
				return;
			}
		}
	}
});