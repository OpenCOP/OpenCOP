/**
 * Handles setting up and querying the ext panels.
 */
var Panel = function() {

  function currentModePanel() {
    if(!Cop.getApp()) {
      return null
    }
    return Cop.getApp().west.selected_layer_panel.tabs.getActiveTab().initialConfig.ref
  }

  function queryFeaturesActive() {
    return currentModePanel() == 'query_features'
  }

  function editFeaturesActive() {
    return currentModePanel() == 'edit_features'
  }

  function layerDetailActive() {
    return currentModePanel() == 'layer_detail'
  }

  function legendActive() {
    return currentModePanel() == 'legend_panel'
  }

  function currentlySelectedLayerNode() {
    if(!Cop.getApp()) {
      return null
    }
    return Cop.getApp().west.tree_panel.getSelectionModel().getSelectedNode()
  }

  function currentlySelectedLayerRecord() {
    var node = currentlySelectedLayerNode()
    return node ? node.layerStore.getById(node.layer.id) : null
  }

  return {
    currentModePanel: currentModePanel,
    queryFeaturesActive: queryFeaturesActive,
    editFeaturesActive: editFeaturesActive,
    layerDetailActive: layerDetailActive,
    currentlySelectedLayerNode: currentlySelectedLayerNode,
    currentlySelectedLayerRecord: currentlySelectedLayerRecord,
    legendActive: legendActive
  }
}()

