<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        <#if messageHeader??>
            ${kcSanitize(msg("${messageHeader}"))?no_esc}
        <#else>
            ${message.summary}
        </#if>
    <#elseif section = "form">
    <div id="kc-info-message">
        <p class="instruction">${message.summary}<#if requiredActions??><#list requiredActions>: <b><#items as reqActionItem>${kcSanitize(msg("requiredAction.${reqActionItem}"))?no_esc}<#sep>, </#items></b></#list><#else></#if></p>
        <#-- gvprlg: where Keycloak offers no link (skipLink, or no redirect/action/client URL, as after
             the invitation from the admin console), link to Spinnenweb instead. -->
        <#if skipLink??>
            <p><a class="${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!}" href="${properties.spinnenwebUrl}">${msg("gvprlgNaarSpinnenweb")}</a></p>
        <#else>
            <#if pageRedirectUri?has_content>
                <p><a href="${pageRedirectUri}">${msg("backToApplication")}</a></p>
            <#elseif actionUri?has_content>
                <p><a href="${actionUri}">${msg("proceedWithAction")}</a></p>
            <#elseif (client.baseUrl)?has_content>
                <p><a href="${client.baseUrl}">${msg("backToApplication")}</a></p>
            <#else>
                <p><a class="${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!}" href="${properties.spinnenwebUrl}">${msg("gvprlgNaarSpinnenweb")}</a></p>
            </#if>
        </#if>
    </div>
    </#if>
</@layout.registrationLayout>