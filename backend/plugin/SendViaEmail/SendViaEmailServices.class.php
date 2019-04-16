<?php

	/**
	 * SendViaEmailServices.class.php
	 *
	 * Copyright 2015- Samuli J�rvel�
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	class SendViaEmailServices extends ServicesBase {		
		protected function isValidPath($method, $path) {
			return count($this->path) == 0;
		}
		
		public function isAuthenticationRequired() {
			return TRUE;
		}
		
		public function processPost() {
			$data = $this->request->data;
			if (!isset($data['to']) or !isset($data['title']) or !isset($data['msg']) or !isset($data['items']))
				throw $this->invalidRequestException("Data missing");
			
			$to = $data['to'];
			$message = $data['msg'];
			$title = $data['title'];
			$items = $this->items($data['items']);
			
			if (count($items) == 0) throw $this->invalidRequestException("Items missing");

			if (Logging::isDebug())
				Logging::logDebug("SENDVIAEMAIL: Sending mail ".$to.":".Util::array2str($items));
			
			$attachments = array();
			foreach($items as $i)
				$attachments[] = $i->internalPath();	//TODO stream
			
			if ($this->env->mailer()->send(array($to), $title, $message, NULL, $attachments))
				$this->response()->success(array());
			else
				$this->response()->error("REQUEST_FAILED", NULL);
		}		
	}
?>
