enum AppType {
    Note = 'NOTE',
    Doc = 'DOC',
}

class PluginButton {
    id: number = 0;

    name: string = '';

    icon: string = '';

    enable: boolean = false;
}

class PluginEditButton extends PluginButton {
    /**
     * Edit data types
     * 0: Handwritten strokes
     * 1: Title
     * 2: Image
     * 3: Text
     * 4: Link
     * 5: Geometric shapes
     */
    editDataTypes = [];
}

class PluginSideButton extends PluginButton {
    /**
     * Expand button type
     * 0: Default value, no button extension, adds an entry to sidebar
     * 1: Pen
     * 2: Eraser
     * 3: Layer
     * 4: Template
     * 5: Thumbnail
     */
    expandButton = 0;
}

export { PluginEditButton, PluginSideButton, PluginButton, AppType };


