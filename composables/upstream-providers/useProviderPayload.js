import { isLikelyValidRegex } from '~/composables/configParity'
import { automaticTestModel, cloneValue, unsetCloakMode } from '~/composables/upstream-providers/categories'
import { v8KeyOverrideFields } from '~/composables/upstream-providers/v8Groups'

// Loads an entry into the editor form and turns the edited form back into a save payload.
export function useProviderPayload({ t, selectedProviderRoute, providerEntries, editor, clearDiscoveryResults, testError, testSuccess }) {
  const {
    providerEditorMode, providerForm, compatKeyRows, addCompatKey, isCompat, providerKey, excludedModelsText, testModel,
    requestRetryText, coolingPolicy, codexCloakingPolicy, requestScopedErrorsText, headerRows,
    cloakMode, cloakStrictMode, cloakSensitiveWordsText, cloakSensitiveWordsReplaceText, cloakSensitivePatternsReplaceText, cloakCacheUserID,
    connectionPoolMode, connectionPoolIdleTimeout, connectionPoolMaxIdle, vertexInteractions, editorError,
    supportsRequestScopedErrors, supportsContextLimit, cloakModeOptions, requiresBaseURL, supportsWebsockets
  } = editor

  function loadGuidedEntry(entry) {
    clearDiscoveryResults()
    providerForm.value = JSON.parse(JSON.stringify(entry))
    compatKeyRows.value = []
    if (isCompat.value) {
      const siblings = providerEditorMode.value === 'edit'
        ? providerEntries.value.filter(candidate => candidate.__v8GroupIndex === entry.__v8GroupIndex)
        : [entry]
      for (const key of siblings.flatMap(candidate => candidate['api-key-entries'] || [])) addCompatKey(key)
      if (providerEditorMode.value === 'create' && !compatKeyRows.value.length) addCompatKey()
    } else if (providerEditorMode.value === 'edit') providerForm.value['api-key'] = ''
    if (!Array.isArray(providerForm.value.models)) providerForm.value.models = []
    if (isCompat.value && !Array.isArray(providerForm.value['api-key-entries'])) providerForm.value['api-key-entries'] = []
    providerForm.value.weight = entry.weight ?? entry['api-key-entries']?.[0]?.weight ?? 1
    providerKey.value = ''
    if (providerEditorMode.value === 'create' && !isCompat.value) providerKey.value = providerForm.value['api-key'] || ''
    if (providerEditorMode.value === 'create' && isCompat.value) providerKey.value = providerForm.value['api-key-entries']?.[0]?.['api-key'] || ''
    if (!providerForm.value.models.length) providerForm.value.models = [{ name: '', alias: '' }]
    excludedModelsText.value = !isCompat.value && Array.isArray(entry['excluded-models']) ? entry['excluded-models'].join('\n') : ''
    testModel.value = String(entry['test-model'] || automaticTestModel)
    testError.value = ''
    testSuccess.value = false
    requestRetryText.value = entry['request-retry'] == null ? '' : String(entry['request-retry'])
    const coolingOverride = !isCompat.value && entry.__v8Group ? entry.__v8Key?.['disable-cooling'] : entry['disable-cooling']
    coolingPolicy.value = coolingOverride == null ? 'inherit' : coolingOverride ? 'disabled' : 'enabled'
    codexCloakingPolicy.value = entry['disable-codex-cloaking'] == null ? 'inherit' : entry['disable-codex-cloaking'] ? 'disabled' : 'enabled'
    requestScopedErrorsText.value = entry['request-scoped-errors'] == null ? '' : JSON.stringify(entry['request-scoped-errors'], null, 2)
    headerRows.value = Object.entries(entry.headers || {}).map(([name, value]) => ({ name, value: typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '' }))
    if (!headerRows.value.length) headerRows.value = [{ name: '', value: '' }]
    const cloak = entry.cloak && typeof entry.cloak === 'object' && !Array.isArray(entry.cloak) ? entry.cloak : null
    cloakMode.value = cloak?.mode || unsetCloakMode
    cloakStrictMode.value = cloak?.['strict-mode'] === true
    cloakSensitiveWordsText.value = Array.isArray(cloak?.['sensitive-words']) ? cloak['sensitive-words'].join('\n') : ''
    cloakSensitiveWordsReplaceText.value = cloak?.['sensitive-words-replace'] && typeof cloak['sensitive-words-replace'] === 'object' && Object.keys(cloak['sensitive-words-replace']).length ? JSON.stringify(cloak['sensitive-words-replace'], null, 2) : ''
    cloakSensitivePatternsReplaceText.value = Array.isArray(cloak?.['sensitive-patterns-replace']) && cloak['sensitive-patterns-replace'].length ? JSON.stringify(cloak['sensitive-patterns-replace'], null, 2) : ''
    cloakCacheUserID.value = cloak?.['cache-user-id'] == null ? 'inherit' : cloak['cache-user-id'] ? 'enabled' : 'disabled'
    // Home normalizes saved groups to one key each and lifts these options onto the group,
    // so show the key value first, then the group value that applies to this key.
    const pool = entry.__v8Key?.['connection-pool'] ?? entry.__v8Group?.['connection-pool'] ?? entry['connection-pool']
    connectionPoolMode.value = pool == null || typeof pool !== 'object' ? 'inherit' : pool.enabled === false ? 'disabled' : 'enabled'
    connectionPoolIdleTimeout.value = pool?.['idle-conn-timeout'] == null ? '' : String(pool['idle-conn-timeout'])
    connectionPoolMaxIdle.value = pool?.['max-idle-conns-per-host'] == null ? '' : String(pool['max-idle-conns-per-host'])
    const interactions = entry.__v8Key?.interactions ?? entry.__v8Group?.interactions ?? entry.interactions
    vertexInteractions.value = interactions == null ? 'inherit' : interactions ? 'true' : 'false'
  }

  function guidedEntry() {
    const value = JSON.parse(JSON.stringify(providerForm.value))
    const priority = value.priority === '' || value.priority == null ? 0 : Number(value.priority)
    if (!Number.isSafeInteger(priority)) {
      editorError.value = t('upstream.providers.priorityInvalid')
      return null
    }
    value.priority = priority
    const weight = value.weight === '' || value.weight == null ? 1 : Number(value.weight)
    if (!Number.isSafeInteger(weight)) {
      editorError.value = t('upstream.providers.weightInvalid')
      return null
    }
    value.weight = weight
    const retry = requestRetryText.value.trim()
    if (retry && (!/^-?\d+$/.test(retry) || !Number.isSafeInteger(Number(retry)))) { editorError.value = t('upstream.providers.retryInvalid'); return null }
    if (retry) value['request-retry'] = Number(retry)
    else if (providerEditorMode.value === 'edit') value['request-retry'] = null
    else delete value['request-retry']
    value['disable-cooling'] = coolingPolicy.value === 'inherit' ? null : coolingPolicy.value === 'disabled'
    if (selectedProviderRoute.value === 'codex-api-key') value['disable-codex-cloaking'] = codexCloakingPolicy.value === 'inherit' ? null : codexCloakingPolicy.value === 'disabled'
    if (supportsRequestScopedErrors.value) {
      try {
        const rules = requestScopedErrorsText.value.trim() ? JSON.parse(requestScopedErrorsText.value) : null
        if (rules !== null && (!Array.isArray(rules) || rules.some(rule => !rule || typeof rule !== 'object' || Array.isArray(rule)
          || (rule.status != null && (!Number.isInteger(rule.status) || rule.status < 100 || rule.status > 599))
          || ['match', 'match-regexr'].some(field => rule[field] != null && (!Array.isArray(rule[field]) || rule[field].some(pattern => typeof pattern !== 'string')))
          || !['stop', 'stop-and-cooldown', 'continue', 'continue-and-cooldown'].includes(rule.action)))) throw new Error()
        value['request-scoped-errors'] = rules
      } catch { editorError.value = t('upstream.providers.rulesInvalid'); return null }
    }
    for (const model of value.models) {
      if (!String(model.name || '').trim() && Object.entries(model).some(([field, setting]) => field !== 'name' && setting != null && setting !== false && setting !== '' && (!Array.isArray(setting) || setting.length))) {
        editorError.value = t('upstream.providers.modelIdRequired')
        return null
      }
    }
    for (const model of value.models) {
      for (const field of supportsContextLimit.value ? ['max-context-length'] : []) {
        if (model[field] === '' || model[field] == null) delete model[field]
        else if (!Number.isSafeInteger(Number(model[field])) || Number(model[field]) <= 0) { editorError.value = t('upstream.providers.contextLimitInvalid'); return null }
        else model[field] = Number(model[field])
      }
      if (model.thinking != null) {
        for (const field of ['min', 'max']) {
          if (model.thinking[field] === '' || model.thinking[field] == null) delete model.thinking[field]
          else if (!Number.isSafeInteger(Number(model.thinking[field])) || Number(model.thinking[field]) < 0) { editorError.value = t('upstream.providers.budgetInvalid'); return null }
          else model.thinking[field] = Number(model.thinking[field])
        }
        if (model.thinking.max > 0 && model.thinking.min > model.thinking.max) { editorError.value = t('upstream.providers.budgetRange'); return null }
      }
      if (isCompat.value) {
        for (const field of ['input-modalities', 'output-modalities']) {
          if (Array.isArray(model[field]) && !model[field].length) delete model[field]
        }
      }
    }
    value.models = value.models.filter(model => String(model.name || '').trim()).map(model => {
      const result = { ...model, name: model.name.trim() }
      if (!String(result.alias || '').trim() || result.alias.trim() === result.name) delete result.alias
      else result.alias = result.alias.trim()
      if (!String(result['display-name'] || '').trim()) delete result['display-name']
      else result['display-name'] = result['display-name'].trim()
      if (result['force-mapping'] == null) delete result['force-mapping']
      return result
    })
    value.headers = {}
    for (const header of headerRows.value) {
      const name = header.name.trim()
      if (!name && header.value.trim()) { editorError.value = t('upstream.providers.headerNameRequired'); return null }
      if (name) value.headers[name] = header.value
    }
    if (!isCompat.value) {
      if (connectionPoolMode.value === 'inherit') value['connection-pool'] = undefined
      else if (connectionPoolMode.value === 'disabled') value['connection-pool'] = { enabled: false }
      else {
        const pool = { enabled: true }
        const idle = connectionPoolIdleTimeout.value.trim()
        if (idle) {
          if (!/^-?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:ns|us|µs|μs|ms|s|m|h))+$|^0$/.test(idle)) { editorError.value = t('upstream.providers.poolIdleTimeoutInvalid'); return null }
          pool['idle-conn-timeout'] = idle
        }
        const maxIdle = String(connectionPoolMaxIdle.value ?? '').trim()
        if (maxIdle) {
          if (!/^-?\d+$/.test(maxIdle) || !Number.isSafeInteger(Number(maxIdle))) { editorError.value = t('upstream.providers.poolMaxIdleInvalid'); return null }
          pool['max-idle-conns-per-host'] = Number(maxIdle)
        }
        value['connection-pool'] = pool
      }
    }
    if (selectedProviderRoute.value === 'vertex-api-key') value.interactions = vertexInteractions.value === 'inherit' ? undefined : vertexInteractions.value === 'true'
    else delete value.interactions
    if (selectedProviderRoute.value === 'claude-api-key') {
      const selectedCloakMode = cloakMode.value === unsetCloakMode ? '' : cloakMode.value
      let wordsReplace = null
      let patternsReplace = null
      try {
        wordsReplace = cloakSensitiveWordsReplaceText.value.trim() ? JSON.parse(cloakSensitiveWordsReplaceText.value) : null
        if (wordsReplace !== null && (typeof wordsReplace !== 'object' || Array.isArray(wordsReplace) || Object.values(wordsReplace).some(item => typeof item !== 'string'))) throw new Error()
      } catch { editorError.value = t('upstream.providers.sensitiveWordsReplaceInvalid'); return null }
      try {
        patternsReplace = cloakSensitivePatternsReplaceText.value.trim() ? JSON.parse(cloakSensitivePatternsReplaceText.value) : null
        if (patternsReplace !== null && (!Array.isArray(patternsReplace) || patternsReplace.some(rule => !rule || typeof rule !== 'object' || Array.isArray(rule) || typeof rule.pattern !== 'string' || !rule.pattern.trim() || !isLikelyValidRegex(rule.pattern) || (rule.replacement != null && typeof rule.replacement !== 'string')))) throw new Error()
      } catch { editorError.value = t('upstream.providers.sensitivePatternsReplaceInvalid'); return null }
      if (selectedCloakMode || cloakStrictMode.value || cloakCacheUserID.value !== 'inherit' || cloakSensitiveWordsText.value.trim() || wordsReplace || patternsReplace) {
        if (!cloakModeOptions.value.some(option => option.value === cloakMode.value)) {
          editorError.value = t('upstream.providers.cloakModeInvalid')
          return null
        }
        const cloak = value.cloak && typeof value.cloak === 'object' && !Array.isArray(value.cloak) ? value.cloak : {}
        value.cloak = { ...cloak, 'strict-mode': cloakStrictMode.value, 'cache-user-id': cloakCacheUserID.value === 'enabled', 'sensitive-words': cloakSensitiveWordsText.value.split(/[,\n]/).map(word => word.trim()).filter(Boolean) }
        if (cloakCacheUserID.value === 'inherit') delete value.cloak['cache-user-id']
        if (selectedCloakMode) value.cloak.mode = selectedCloakMode
        else delete value.cloak.mode
        if (wordsReplace && Object.keys(wordsReplace).length) value.cloak['sensitive-words-replace'] = wordsReplace
        else delete value.cloak['sensitive-words-replace']
        if (patternsReplace && patternsReplace.length) value.cloak['sensitive-patterns-replace'] = patternsReplace
        else delete value.cloak['sensitive-patterns-replace']
      } else {
        const remaining = { ...value.cloak }
        for (const field of ['mode', 'strict-mode', 'sensitive-words', 'sensitive-words-replace', 'sensitive-patterns-replace', 'cache-user-id']) delete remaining[field]
        if (Object.keys(remaining).length) value.cloak = remaining
        else delete value.cloak
      }
    }
    if (isCompat.value) delete value['excluded-models']
    else value['excluded-models'] = excludedModelsText.value.split(/[,\n]/).map(item => item.trim()).filter(Boolean)
    value['base-url'] = String(value['base-url'] || '').trim()
    value.prefix = String(value.prefix || '').trim()
    if (!isCompat.value) {
      value['proxy-url'] = String(value['proxy-url'] || '').trim()
      if (value['proxy-url']) {
        try {
          if (!['http:', 'https:', 'socks5:', 'socks5h:'].includes(new URL(value['proxy-url']).protocol)) throw new Error()
        } catch { editorError.value = t('upstream.providers.proxyInvalid'); return null }
      }
    }
    if (isCompat.value && !String(value.name || '').trim()) {
      editorError.value = t('upstream.providers.nameRequired')
      return null
    }
    if (requiresBaseURL.value && !String(value['base-url'] || '').trim()) {
      editorError.value = t('upstream.providers.baseUrlRequiredProvider')
      return null
    }
    if (!isCompat.value && providerEditorMode.value === 'create' && !providerKey.value.trim()) {
      editorError.value = t('upstream.providers.serviceKeyRequired')
      return null
    }
    if (isCompat.value) {
      value.name = value.name.trim()
      if (testModel.value !== automaticTestModel && testModel.value.trim()) value['test-model'] = testModel.value.trim()
      else delete value['test-model']
      delete value['proxy-url']
      value['api-key-entries'] = []
      for (const [index, row] of compatKeyRows.value.entries()) {
        const key = cloneValue(row.source)
        const secret = row.secret.trim() || key['api-key'] || ''
        if (!secret) { editorError.value = t('upstream.providers.keyApiKeyRequired', { n: index + 1 }); return null }
        key['api-key'] = secret
        const proxy = row.proxy.trim()
        if (proxy && proxy !== 'direct') {
          try {
            if (!['http:', 'https:', 'socks5:', 'socks5h:'].includes(new URL(proxy).protocol)) throw new Error()
          } catch { editorError.value = t('upstream.providers.keyProxyInvalid', { n: index + 1 }); return null }
        }
        if (proxy) key['proxy-url'] = proxy
        else delete key['proxy-url']
        if (row.weight === '' || row.weight == null) delete key.weight
        else {
          const keyWeight = Number(row.weight)
          if (!Number.isSafeInteger(keyWeight) || keyWeight > 1000000) { editorError.value = t('upstream.providers.keyWeightInvalid', { n: index + 1 }); return null }
          key.weight = keyWeight
        }
        value['api-key-entries'].push(key)
      }
    } else if (providerKey.value.trim()) value['api-key'] = providerKey.value.trim()
    else delete value['api-key']
    const payload = {
      ...value,
      priority: value.priority,
      headers: value.headers,
      models: value.models,
      'disable-cooling': value['disable-cooling']
    }
    if (!isCompat.value) payload['excluded-models'] = value['excluded-models']
    for (const field of ['name', 'base-url', 'proxy-url', 'prefix']) payload[field] = value[field]
    payload.weight = value.weight
    if (Object.hasOwn(value, 'request-retry')) payload['request-retry'] = value['request-retry']
    if (supportsWebsockets.value) payload.websockets = Boolean(value.websockets)
    if (isCompat.value) {
      payload.disabled = Boolean(value.disabled)
      if (value['test-model']) payload['test-model'] = value['test-model']
      if (value['api-key-entries']) payload['api-key-entries'] = value['api-key-entries']
    } else if (value['api-key']) payload['api-key'] = value['api-key']
    if (selectedProviderRoute.value === 'claude-api-key' && value.cloak) payload.cloak = value.cloak
    for (const field of v8KeyOverrideFields) delete payload[field]
    if (!isCompat.value) payload['__set:connection-pool'] = value['connection-pool'] ?? null
    if (selectedProviderRoute.value === 'vertex-api-key') payload['__set:interactions'] = value.interactions ?? null
    return payload
  }

  return { loadGuidedEntry, guidedEntry }
}
