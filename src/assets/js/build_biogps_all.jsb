<?xml version="1.0" encoding="utf-8"?>
<project path="" name="Build BioGPS all" author="Chunlei Wu, Marc Leglise" version="1.0" copyright="$projectName&#xD;&#xA;Copyright(c) 2008, GNF&#xD;&#xA;Author: $author" output="$project\" source="False" source-dir="$output\source" minify="False" min-dir="$output\build" doc="False" doc-dir="$output\docs" master="true" master-file="$output\yui-ext.js" zip="true" zip-file="$output\yuo-ext.$version.zip">
  <directory name="biogps" />
  <file name="biogps\searchresultpanel.js" path="" />
  <file name="biogps\searchpanel.js" path="" />
  <file name="biogps\genelistpanel.js" path="" />
  <file name="biogps\genereportpanel.js" path="" />
  <file name="biogps\loginform.js" path="" />
  <file name="biogps\biogps_base.js" path="" />
  <file name="biogps\infobar.js" path="" />
  <file name="biogps\biogps.js" path="" />
  <target name="biogps_all.js" file="$output\biogps_all.js" debug="True" shorthand="False" shorthand-list="YAHOO.util.Dom.setStyle&#xD;&#xA;YAHOO.util.Dom.getStyle&#xD;&#xA;YAHOO.util.Dom.getRegion&#xD;&#xA;YAHOO.util.Dom.getViewportHeight&#xD;&#xA;YAHOO.util.Dom.getViewportWidth&#xD;&#xA;YAHOO.util.Dom.get&#xD;&#xA;YAHOO.util.Dom.getXY&#xD;&#xA;YAHOO.util.Dom.setXY&#xD;&#xA;YAHOO.util.CustomEvent&#xD;&#xA;YAHOO.util.Event.addListener&#xD;&#xA;YAHOO.util.Event.getEvent&#xD;&#xA;YAHOO.util.Event.getTarget&#xD;&#xA;YAHOO.util.Event.preventDefault&#xD;&#xA;YAHOO.util.Event.stopEvent&#xD;&#xA;YAHOO.util.Event.stopPropagation&#xD;&#xA;YAHOO.util.Event.stopEvent&#xD;&#xA;YAHOO.util.Anim&#xD;&#xA;YAHOO.util.Motion&#xD;&#xA;YAHOO.util.Connect.asyncRequest&#xD;&#xA;YAHOO.util.Connect.setForm&#xD;&#xA;YAHOO.util.Dom&#xD;&#xA;YAHOO.util.Event">
    <include name="biogps\biogps_base.js" />
    <include name="biogps\infobar.js" />
    <include name="biogps\loginform.js" />
    <include name="biogps\biogpslayout.js" />
    <include name="biogps\biogpsplugin.js" />
    <include name="biogps\pluginpanel.js" />
    <include name="biogps\mystuff.js" />
    <include name="biogps\searchpanel.js" />
    <include name="biogps\genelistpanel.js" />
    <include name="biogps\searchresultpanel.js" />
    <include name="biogps\genereportpanel.js" />
    <include name="biogps\biogps.js" />
  </target>
  <file name="biogps\biogpsplugin.js" path="" />
  <file name="biogps\biogpslayout.js" path="" />
  <file name="biogps\mystuff.js" path="" />
  <file name="biogps\pluginpanel.js" path="" />
</project>