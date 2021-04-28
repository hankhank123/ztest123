/*
 * Copyright (C) 2009-2018 SAP SE or an SAP affiliate company. All rights reserved.
 */
jQuery.sap.declare("cus.o2c.billplan.manage.s1.Component");
sap.ui.getCore().loadLibrary("sap.ui.generic.app");
jQuery.sap.require("sap.ui.generic.app.AppComponent");

sap.ui.generic.app.AppComponent.extend("cus.o2c.billplan.manage.s1.Component", {
	metadata: {
		"manifest": "json"
	},
    manifestFirst: true,
    async: true
});