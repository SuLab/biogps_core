/**
 * @class biogps.PluginQuickAdd An autocompleting field for adding plugins to layouts on the fly.
 * @namespace biogps
 * @extends Ext.form.ComboBox
 * @cfg {object} grp The GeneReportPage object that this tool is a part of.
 * @constructor
 * @param {object} config
 * An object containing the required configuration options for this class.
 */
biogps.PluginQuickAdd = function(config) {
    this.grp = null;
  Ext.apply(this, config);

    // Local Store for Browsing / Searching
    this.pluginStore = new biogps.pluginJsonStore({
        url: '/search/plugin/',
        method: 'GET',
        root: 'hits.hits',
        totalProperty: 'hits.total',
        id: '_id',
        fields: [],
        listeners: {
            'beforeload': {
                scope: this,
                fn: function(pS, conf) {
                    // Ensure basic parameters are in place.
                    // We use this way of doing it, because when using the
                    // pluginStore's baseParams, they are not changeable.
                    conf.params.format = 'json';
                    conf.params.quickadd = '1';   //add a quickadd parameter to mark the query.
                }
            }
        }
    });

    this.pluginTpl = new Ext.XTemplate(
        '<tpl for=".">',
        '<div class="x-combo-list-item pluginbox-quick">',
            '<span class="name">{name}</span><br />',
            '<tpl if="1 <= values.usage_data.layouts">',
                '<span class="usage">Layout Popularity: {values.usage_data.layouts:round(0)}</span>',
            '</tpl>',
            '<span class="detailLink"><a href="/plugin/{id}/" onclick="biogps.GeneReportMgr.collapseQuickLists();event.cancelBubble=true;">Details</a></span>',
            '<p class="url">{[shortUrl(values.url)]}</p>',
        '</div></tpl>'
    );

    // Call the Ext.form.ComboBox constructor
    biogps.PluginQuickAdd.superclass.constructor.call(this,{
        emptyText: 'Add a Plugin',
        loadingText: 'Searching...',
        store: this.pluginStore,
        tpl: this.pluginTpl,
        pageSize: 5,
        minChars: 0,
        lazyInit: false, // Setup the list right away so we can change its z-index
        displayField: 'name',
        queryParam: 'q',
        listAlign: 'tr-br?',
        listWidth: 250,
        width: 100,
        onSelect: function(record){ //override default onSelect
            this.collapse();
            this.grp.grlayout.quickAddPlugin(record);
        },
        listeners: {
            'beforequery': {
                scope: this,
                fn: function(qevt) {
                    //trim the input query and add "*" to the query for
                    //wildchar search.
                    var q = qevt.query.trim();
                    if (q) {
                      q += "*";
                    }
                    qevt.query = q;
                }
            }
        }
  });
};
Ext.extend(biogps.PluginQuickAdd, Ext.form.ComboBox, {
})
