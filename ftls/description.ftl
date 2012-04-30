<table style="border-collapse:collapse; border: 1px solid;padding: 0.25 0.5em;" class="featureInfo">
    <#list attributes as attribute>
      <#if
         !attribute.name.equals("version")
         && !attribute.name.equals("edit_url")
         && !attribute.name.equals("AtFile1")
         && !attribute.name.equals("AtFile2")
        && !attribute.name.equals("the_geom")>

        <tr style="border-collapse:collapse; border: 1px solid;padding: 0.25 0.5em;">
          <th style="text-align: left; border-collapse:collapse; border: 1px solid;padding: 0.25 0.5em;">
${attribute.name?replace("_", " ")?capitalize}
</th>
          <td style="border-collapse:collapse; border: 1px solid;padding: 0.25 0.5em;">${attribute.value}</td>
        </tr>
      </#if>
</#list>
</table>
${edit_url.value?replace("Edit", "Secure Edit")}

