/**
 * @tag controllers, home
 * Displays a table of plugins.  Lets the user 
 * ["Biogps.Controllers.Plugin.prototype.form submit" create], 
 * ["Biogps.Controllers.Plugin.prototype.&#46;edit click" edit],
 * or ["Biogps.Controllers.Plugin.prototype.&#46;destroy click" destroy] plugins.
 */
$.Controller.extend('Biogps.Controllers.Plugin',
/* @Static */
{
    onDocument: true
},
/* @Prototype */
{
    /**
     * When the page loads, gets all plugins to be displayed.
     */
    load: function(){
        if(!$("#plugin").length) 
            $(document.body).append($('<div/>').attr('id','plugin'))
        Biogps.Models.Plugin.findAll({}, this.callback('list'));
    },
    /**
     * Displays a list of plugins and the submit form.
     * @param {Array} plugins An array of Biogps.Models.Plugin objects.
     */
    list: function(plugins){
        $('#plugin').html(this.view('init', {plugins:plugins} ))
    },
    /**
     * Responds to the create form being submitted by creating a new Biogps.Models.Plugin.
     * @param {jQuery} el A jQuery wrapped element.
     * @param {Event} ev A jQuery event whose default action is prevented.
     */
    "form submit" : function(el, ev){
        ev.preventDefault();
        new Biogps.Models.Plugin( el.formParams() ).save();
    },
    /**
     * Listens for plugins being created.  When a plugin is created, displays the new plugin.
     * @param {String} called The open ajax event that was called.
     * @param {Event} plugin The new plugin.
     */
    "plugin.created subscribe": function(called, plugin){
		$("#plugin tbody").append( this.view("list", {plugins:[plugin]}) )
        $("#plugin form input[type!=submit]").val(""); //clear old vals
    },
    /**
     * Creates and places the edit interface.
     * @param {jQuery} el The plugin's edit link element.
     */
    '.edit click' : function(el){
        var plugin = el.closest('.plugin').model();
        plugin.elements().html(this.view('edit', plugin))
    },
    /**
     * Removes the edit interface.
     * @param {jQuery} el The plugin's cancel link element.
     */
    '.cancel click': function(el){
        this.show(el.closest('.plugin').model());
    },
    /**
     * Updates the plugin from the edit values.
     */
    '.update click': function(el){
        var $plugin = el.closest('.plugin'); 
        $plugin.model().update( $plugin.formParams()  )
    },
    /**
     * Listens for updated plugins.  When a plugin is updated, 
     * update's its display.
     */
    'plugin.updated subscribe' : function(called, plugin){
        this.show(plugin);
    },
    /**
     * Shows a plugin's information.
     */
    show: function(plugin){
        plugin.elements().html(this.view('show',plugin))
    },
    /**
     *  Handle's clicking on a plugin's destroy link.
     */
    '.destroy click' : function(el){
        if(confirm("Are you sure you want to destroy?"))
            el.closest('.plugin').model().destroy();
    },
    /**
     *  Listens for plugins being destroyed and removes them from being displayed.
     */
    "plugin.destroyed subscribe" : function(called, plugin){
        plugin.elements().remove();  //removes ALL elements
    }
});