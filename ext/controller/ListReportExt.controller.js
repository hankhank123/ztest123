/*
 * Copyright (C) 2009-2018 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.controller("cus.o2c.billplan.manage.s1.ext.controller.ListReportExt", {
	onInit: function() {
		var t = this;
		this.footerAnimated = false;
		var b = new sap.ui.model.json.JSONModel({
			"release-enable": false,
			"discard-enable": false,
			"delete-enable": false,
			"complete-enable": false,
			"reopen-enable": false
		});
		this.getView().setModel(b, "buttonTargets");
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
		var h = ["addEntry", "deleteEntry"];
		for (var i = 0; i < h.length; i++) {
			this.byId(h[i]).setVisible(false);
		}
		this.getView().byId("listReport").getTable().attachSelectionChange(function() {
			t.updateCopyAndSimulateButtonState();
			t.updateFunctionButtonsState();
		});
		var a = ["CABillgPlnCreatedByUser", "CABillgPlnChangedByUser", "CABillgPlnTypeDisplay"];
		this.getView().byId("listReport").setIgnoreFromPersonalisation(a.join(","));
		this.getView().setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "messages");
	},
	onAfterRendering: function() {
		var t = this;
		this.getView().getModel().attachBatchRequestCompleted(function() {
			t.updateFunctionButtonsState();
		});
		this.getView().getModel().attachBatchRequestSent(function() {
			sap.ui.getCore().getMessageManager().removeAllMessages();
			t.oMessagePopover.close();
			var i = setInterval(function() {
				var m = t.getView().getModel();
				var a = sap.ui.getCore().getMessageManager().getMessageModel().getData();
				if (!m.hasPendingRequests() && !a.length) {
					var p = t.getView().byId("page");
					p.setShowFooter(false);
					clearInterval(i);
				} else if (!m.hasPendingRequests() && a.length) {
					clearInterval(i);
				}
			}, 200);
		});
		this.createMessagePopover();
	},
	updateFunctionButtonsState: function() {
		var b = this.getView().getModel("buttonTargets");
		var s = this.extensionAPI.getSelectedContexts();
		var u = function(a) {
			switch (a) {
				case "":
					b.setProperty("/release-enable", false);
					b.setProperty("/discard-enable", false);
					b.setProperty("/delete-enable", false);
					b.setProperty("/complete-enable", false);
					b.setProperty("/reopen-enable", false);
					break;
				case "O":
					b.setProperty("/release-enable", true);
					b.setProperty("/discard-enable", true);
					b.setProperty("/delete-enable", true);
					b.setProperty("/complete-enable", false);
					b.setProperty("/reopen-enable", false);
					break;
				case "R":
					b.setProperty("/release-enable", false);
					b.setProperty("/discard-enable", true);
					b.setProperty("/delete-enable", false);
					b.setProperty("/complete-enable", true);
					b.setProperty("/reopen-enable", false);
					break;
				case "X":
					b.setProperty("/release-enable", false);
					b.setProperty("/discard-enable", false);
					b.setProperty("/delete-enable", true);
					b.setProperty("/complete-enable", false);
					b.setProperty("/reopen-enable", false);
					break;
				case "F":
					b.setProperty("/release-enable", false);
					b.setProperty("/discard-enable", false);
					b.setProperty("/delete-enable", true);
					b.setProperty("/complete-enable", false);
					b.setProperty("/reopen-enable", true);
					break;
				default:
					break;
			}
		};
		var c = function(a) {
			var f = {};
			return a.filter(function(g) {
				return f.hasOwnProperty(g) ? false : (f[g] = true);
			});
		};
		if (s.length === 1) {
			var H = s[0].getProperty("HasActiveEntity");
			var d = s[0].getProperty("HasDraftEntity");
			if (!H && !d) {
				u(s[0].getProperty("CABillgPlnStatus"));
			} else {
				if (s[0].getProperty("CABillgPlnStatus") === "F") {
					u("F");
				} else {
					u("");
				}
			}
		} else if (s.length > 1) {
			for (var i = 0; i < s.length; i++) {
				var H = s[i].getProperty("HasActiveEntity");
				var d = s[i].getProperty("HasDraftEntity");
				if (H || d) {
					if (s[i].getProperty("CABillgPlnStatus") === "F") {
						continue;
					}
					u("");
					return;
				}
			}
			var e = [];
			for (i = 0; i < s.length; i++) {
				e.push(s[i].getProperty("CABillgPlnStatus"));
			}
			e = c(e);
			if (e.length === 1) {
				u(e[0]);
			} else {
				u("");
			}
		} else {
			u("");
		}
	},
	updateCopyAndSimulateButtonState: function() {
		var b = [this.getView().byId("idCopyPlan"), this.getView().byId("idSimulatePlan")];
		for (var i = 0; i < b.length; i++) {
			if (typeof b[i] !== "undefined") {
				if (this.extensionAPI.getSelectedContexts().length === 1) {
					b[i].setProperty("enabled", true);
				} else {
					b[i].setProperty("enabled", false);
				}
			}
		}
	},
	onCreatePlanPress: function(E) {
		var t = this;
		var f = "cus.o2c.billplan.manage.s1.ext.fragments.CreateBillingPlan";
		var m = this.getView().getModel();
		var p = "C_CABillgPln";
		var o = this.extensionAPI;
		var i = this.getView().getModel("i18n").getResourceBundle();
		var d = this.getView().getBusyIndicatorDelay();
		this.getView().setBusyIndicatorDelay(0).setBusy(true).setBusyIndicatorDelay(d);
		var s = function(r) {
			t.getView().setBusy(false);
			if (!r) {
				return;
			}
			var c = new sap.ui.model.Context(m, r.context.sPath);
			var _ = sap.ui.xmlfragment(t.getView().getId(), f, {
				onCreatePress: function(e) {
					var b = t.getView().byId("idFieldPlanType");
					var v = b.getValue();
					if (!v.length) {
						b.setValueState("Error");
						return;
					}
					_.setBusyIndicatorDelay(0).setBusy(true);
					m.read("/I_CABillgPlnTypeEditable", {
						filters: [new sap.ui.model.Filter("CABillgPlnType", sap.ui.model.FilterOperator.EQ, v)],
						success: function(g, h) {
							if (g.results.length !== 1) {
								b.setValueState("Error");
								b.setValueStateText(i.getText("unknownPlanType"));
								_.setBusy(false);
								return;
							}
							o.getNavigationController().navigateInternal(c);
						},
						error: function(g) {
							_.setBusy(false);
						}
					});
				},
				onCancelPress: function() {
					m.remove("", {
						context: c,
						success: function() {
							m.refresh(true);
							_.close();
						}
					});
					_.close();
				},
				afterClose: function() {
					_.destroy();
				}
			});
			_.setBindingContext(c);
			o.attachToView(_);
			_.open();
			m.refresh(true);
		};
		var a = function(e) {
			t.getView.setBusy(false);
			t._handleMessagePopover(t);
		};
		var D = new sap.ui.generic.app.transaction.DraftController(m);
		D.createNewDraftEntity(p, p).then(s).catch(a);
	},
	onCopyPlanPress: function(e) {
		var t = this;
		var m = this.getView().getModel();
		var p = "/C_CABillgPln";
		var E = this.extensionAPI;
		var n = m.createEntry(p, {
			properties: {
				"CABillgPlnNumberRef": m.getProperty("CABillgPlnNumber", this.extensionAPI.getSelectedContexts()[0])
			},
			success: function() {
				m.refresh(true);
				E.getNavigationController().navigateInternal(n);
			},
			error: function() {
				t._handleMessagePopover(t);
			}
		});
	},
	onDiscardPlanPress: function(e) {
		this._executeOneClickFunction("/C_CABillgPlnDiscard", e.getSource());
	},
	onReleasePlanPress: function(e) {
		this._executeOneClickFunction("/C_CABillgPlnRelease", e.getSource());
	},
	onCompletePlanPress: function(e) {
		this._executeOneClickFunction("/C_CABillgPlnComplete", e.getSource());
	},
	onReopenPlanPress: function(e) {
		this._executeOneClickFunction("/C_CABillgPlnReopen", e.getSource());
	},
	_executeOneClickFunction: function(p, b) {
		var t = this;
		var m = this.getView().getModel();
		var s = this.extensionAPI.getSelectedContexts();
		b.setBusyIndicatorDelay(0).setBusy(true);
		var a = function() {
			b.setBusy(false);
			m.refresh(true);
			t._handleMessagePopover(t);
		};
		var e = function() {
			b.setBusy(false);
			t._handleMessagePopover(t);
		};
		for (var i = 0; i < s.length; i++) {
			this.extensionAPI.invokeActions(p, s[i]).then(a).catch(e);
		}
	},
	onDeletePlanPress: function(e) {
		var t = this;
		var m = this.getView().getModel();
		var s = this.extensionAPI.getSelectedContexts();
		var a = function() {
			m.refresh(true);
			t._handleMessagePopover(t);
		};
		var b = function() {
			t._handleMessagePopover(t);
		};
		for (var i = 0; i < s.length; i++) {
			m.remove(s[i].sPath, {
				context: s[i],
				success: a,
				error: b
			});
		}
	},
	onSimulatePlanPress: function(E) {
		var t = this;
		var f = "cus.o2c.billplan.manage.s1.ext.fragments.SimulateBillingPlan";
		var m = this.getView().getModel();
		var a = this.extensionAPI;
		var b = this.getView().getModel("i18n").getResourceBundle();
		var c = this.extensionAPI.getSelectedContexts();
		if (c.length !== 1) {
			return;
		}
		var d = this.getView().getBusyIndicatorDelay();
		this.getView().setBusyIndicatorDelay(0).setBusy(true).setBusyIndicatorDelay(d);
		var s = function(r) {
			t.getView().setBusy(false);
			if (!r) {
				return;
			}
			var l = r["0"].response.data.results;
			var o = {};
			$.each(l, function(k, v) {
				v.text = b.getText("treeItemText") + " " + parseInt(v.Billplanitem, 10) + " - " + v.BitAmount + " " + v.BitCurr;
				delete v.__metadata;
				var e = v.BillFirst;
				delete v.BillFirst;
				if (o.hasOwnProperty(v.BillFirst)) {
					o[e].items.push(v);
				} else {
					o[e] = {
						"nodes": [v],
						"text": e.toLocaleDateString()
					};
				}
			});
			var _ = sap.ui.xmlfragment(t.getView().getId(), f, {
				onCreatePress: function(e) {},
				onCancelPress: function(e) {
					_.close();
				},
				afterClose: function(e) {
					_.destroy();
				}
			});
			o = $.map(o, function(v, k) {
				return v;
			});
			for (var i = 0; i < o.length; i++) {
				var n = 0;
				var q = o[i].nodes[0].BitCurr;
				for (var j = 0; j < o[i].nodes.length; j++) {
					n = n + parseFloat(o[i].nodes[j].BitAmount, 10);
				}
				o[i].text = o[i].text + " - " + n + " " + q;
			}
			t.getView().setModel(new sap.ui.model.json.JSONModel(o), "SIM");
			a.attachToView(_);
			_.open();
		};
		var g = c[0].getModel().getData(c[0].sPath);
		var h = function() {
			t._handleMessagePopover(t);
		};
		var p = {
			CABillgPlnNumber: g.CABillgPlnNumber,
			BusinessPartner: g.BusinessPartner,
			ContractAccount: g.ContractAccount
		};
		this.extensionAPI.invokeActions("/BillgPlnSimulate", c[0], p).then(s).catch(h);
	},
	createMessagePopover: function() {
		var t = this;
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
		this.oFooter = this.getView().byId("page").getFooter();
		this.oBtnMsgPopover = new sap.m.Button({
			icon: "sap-icon://message-popup",
			type: "Emphasized"
		});
		this.oFooter.insertContent(this.oBtnMsgPopover, 0);
		this.oBtnMsgPopover.bindProperty("text", {
			path: "messages>/",
			formatter: function(p) {
				return p.length ? p.length.toString() : "";
			}
		});
		this.oBtnMsgPopover.attachPress(function(e) {
			t.oMessagePopover.toggle(e.getSource());
		});
	},
	_removeDuplicateMessages: function() {
		var m = sap.ui.getCore().getMessageManager().getMessageModel().getData();
		var u = [];
		for (var i = 0; i < m.length; i++) {
			if (u.indexOf(m[i].message) < 0) {
				u.push(m[i].message);
			} else {
				sap.ui.getCore().getMessageManager().removeMessages([m[i]]);
			}
		}
	},
	_handleMessagePopover: function(c) {
		this._removeDuplicateMessages();
		var m = sap.ui.getCore().getMessageManager().getMessageModel().getData();
		for (var i = 0; i < m.length; i++) {
			if (m[i].type === "Error") {
				var p = c.getView().byId("page");
				if (!p.getShowFooter()) {
					p.setShowFooter(true);
					c.footerAnimated = true;
					setTimeout(function() {
						c.oMessagePopover.openBy(c.oBtnMsgPopover);
						c.footerAnimated = false;
					}, sap.f.DynamicPage.FOOTER_ANIMATION_DURATION);
					return;
				}
				if (!c.footerAnimated) {
					c.oMessagePopover.openBy(c.oBtnMsgPopover);
				}
				return;
			}
		}
	}
});