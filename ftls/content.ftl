<table border=1 class="featureInfo">
  <caption class="featureInfo">${type.name} Layer</caption>
  <#list features as feature>
      <#list feature.attributes as attribute>
        <#if !attribute.isGeometry
          && !attribute.name.equals("default_graphic_size")
          && !attribute.name.equals("version")
          && !attribute.name.equals("default_color")
          && !attribute.name.equals("default_graphic")>
          <tr>
            <th>${attribute.name?replace("_", " ")?capitalize}</th>
            <td>${attribute.value}</td>
          </tr>
        </#if>
      </#list>
    <tr><td colspan='2'>&nbsp;</td></tr>
  </#list>
</table>
<br />

