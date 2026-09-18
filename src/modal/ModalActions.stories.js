import { useState } from '@wordpress/element';
import {
	Button,
	Modal,
	TextControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { Text } from '@wordpress/ui';

import { ModalActions } from './ModalActions';
import { ModalBody } from './ModalBody';

export default {
	title: 'Modals/ModalActions',
	component: ModalActions,
	subcomponents: { ModalBody },
	parameters: {
		// Each story renders an open modal; give each its own frame on the
		// docs page instead of stacking every overlay on top of the others.
		docs: { story: { inline: false, iframeHeight: 460 } },
	},
};

function useOpen() {
	const [ isOpen, setIsOpen ] = useState( true );
	const opener = (
		<Button variant="secondary" onClick={ () => setIsOpen( true ) }>
			Open modal
		</Button>
	);
	return [ isOpen, () => setIsOpen( false ), opener ];
}

/** `ModalBody` owns the rhythm between blocks; `ModalActions` is the footer. */
export const Form = {
	render: function Render() {
		const [ isOpen, close, opener ] = useOpen();
		return (
			<>
				{ opener }
				{ isOpen && (
					<Modal title="Add source" onRequestClose={ close }>
						<ModalBody>
							<Text variant="body-md" render={ <p /> }>
								Sources are checked every hour for new items.
							</Text>
							<TextControl
								label="Name"
								value="City council agendas"
								onChange={ () => {} }
							/>
							<TextControl
								label="Feed URL"
								value="https://example.com/feed"
								onChange={ () => {} }
							/>
							<ToggleGroupControl
								label="Check every"
								value="hour"
								isBlock
								onChange={ () => {} }
							>
								<ToggleGroupControlOption
									value="hour"
									label="Hour"
								/>
								<ToggleGroupControlOption
									value="day"
									label="Day"
								/>
							</ToggleGroupControl>
						</ModalBody>
						<ModalActions>
							<Button variant="tertiary" onClick={ close }>
								Cancel
							</Button>
							<Button variant="primary" onClick={ close }>
								Add source
							</Button>
						</ModalActions>
					</Modal>
				) }
			</>
		);
	},
};

/**
 * Something to read, not a question: one Close. A yes/no question is
 * `useConfirm`, not a hand-built pair of buttons.
 */
export const Informational = {
	render: function Render() {
		const [ isOpen, close, opener ] = useOpen();
		return (
			<>
				{ opener }
				{ isOpen && (
					<Modal
						title="Why this post is locked"
						size="small"
						onRequestClose={ close }
					>
						<ModalBody>
							<Text variant="body-md" render={ <p /> }>
								Published posts go back through review before
								their changes go live.
							</Text>
						</ModalBody>
						<ModalActions>
							<Button variant="primary" onClick={ close }>
								Close
							</Button>
						</ModalActions>
					</Modal>
				) }
			</>
		);
	},
};
