<?php

/**
 * SVGPreviewer.class.php
 *
 * Copyright 2015- Samuli J�rvel�
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class SVGPreviewer extends PreviewerBase {
	public function getPreviewHtml($item) {
		return
		'<div class="svg-previewer-container">' .
		'<object data="' . $this->getContentUrl($item) . '" type="image/svg+xml"></object>' .
		'</div>';
	}
}
?>