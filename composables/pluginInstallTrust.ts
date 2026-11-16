export function pluginInstallTrust(plugin: { id: string }) {
  // Registry metadata cannot establish the provenance of the downloaded code.
  return { confirmation: plugin.id }
}
