/*global QUnit*/

jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

sap.ui.require([
	"sap/ui/test/Opa5",
	"zyytt1/zyytt1/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"zyytt1/zyytt1/test/integration/pages/Worklist",
	"zyytt1/zyytt1/test/integration/pages/Object",
	"zyytt1/zyytt1/test/integration/pages/NotFound",
	"zyytt1/zyytt1/test/integration/pages/Browser",
	"zyytt1/zyytt1/test/integration/pages/App"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "zyytt1.zyytt1.view."
	});

	sap.ui.require([
		"zyytt1/zyytt1/test/integration/WorklistJourney",
		"zyytt1/zyytt1/test/integration/ObjectJourney",
		"zyytt1/zyytt1/test/integration/NavigationJourney",
		"zyytt1/zyytt1/test/integration/NotFoundJourney",
		"zyytt1/zyytt1/test/integration/FLPIntegrationJourney"
	], function () {
		QUnit.start();
	});
});