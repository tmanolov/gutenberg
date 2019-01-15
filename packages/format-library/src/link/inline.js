/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { sprintf, __ } from '@wordpress/i18n';
import { Component, createRef } from '@wordpress/element';
import {
	ExternalLink,
	IconButton,
	ToggleControl,
	withSpokenMessages,
	Slot,
} from '@wordpress/components';
import { LEFT, RIGHT, UP, DOWN, BACKSPACE, ENTER } from '@wordpress/keycodes';
import { prependHTTP, safeDecodeURI, filterURLForDisplay } from '@wordpress/url';
import {
	create,
	insert,
	isCollapsed,
	applyFormat,
	getTextContent,
	slice,
} from '@wordpress/rich-text';
import { URLInput, URLPopover } from '@wordpress/editor';

/**
 * Internal dependencies
 */
import PositionedAtSelection from './positioned-at-selection';
import { isValidHref } from './utils';

const stopKeyPropagation = ( event ) => event.stopPropagation();

/**
 * Generates the format object that will be applied to the link text.
 *
 * @param {Object} attributes The link element's attributes.
 *
 * @return {Object} The final format object.
 */
function createLinkFormat( attributes ) {
	return {
		type: 'core/link',
		attributes,
	};
}

function isShowingInput( props, state ) {
	return props.addingLink || state.editLink;
}

const LinkEditor = ( { value, onChangeInputValue, onKeyDown, submitLink, autocompleteRef } ) => (
	// Disable reason: KeyPress must be suppressed so the block doesn't hide the toolbar
	/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
	<form
		className="editor-format-toolbar__link-container-content"
		onKeyPress={ stopKeyPropagation }
		onKeyDown={ onKeyDown }
		onSubmit={ submitLink }
	>
		<URLInput
			value={ value }
			onChange={ onChangeInputValue }
			autocompleteRef={ autocompleteRef }
		/>
		<IconButton icon="editor-break" label={ __( 'Apply' ) } type="submit" />
	</form>
	/* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
);

const LinkViewerUrl = ( { url } ) => {
	const prependedURL = prependHTTP( url );
	const linkClassName = classnames( 'editor-format-toolbar__link-container-value', {
		'has-invalid-link': ! isValidHref( prependedURL ),
	} );

	if ( ! url ) {
		return <span className={ linkClassName }></span>;
	}

	return (
		<ExternalLink
			className={ linkClassName }
			href={ url }
		>
			{ filterURLForDisplay( safeDecodeURI( url ) ) }
		</ExternalLink>
	);
};

const LinkViewer = ( { url, editLink } ) => {
	return (
		// Disable reason: KeyPress must be suppressed so the block doesn't hide the toolbar
		/* eslint-disable jsx-a11y/no-static-element-interactions */
		<div
			className="editor-format-toolbar__link-container-content"
			onKeyPress={ stopKeyPropagation }
		>
			<LinkViewerUrl url={ url } />
			<IconButton icon="edit" label={ __( 'Edit' ) } onClick={ editLink } />
		</div>
		/* eslint-enable jsx-a11y/no-static-element-interactions */
	);
};

class InlineLinkUI extends Component {
	constructor( props ) {
		super( ...arguments );

		this.editLink = this.editLink.bind( this );
		this.submitLink = this.submitLink.bind( this );
		this.onKeyDown = this.onKeyDown.bind( this );
		this.onChangeInputValue = this.onChangeInputValue.bind( this );
		this.setLinkTarget = this.setLinkTarget.bind( this );
		this.onClickOutside = this.onClickOutside.bind( this );
		this.resetState = this.resetState.bind( this );
		this.setLinkAttributes = this.setLinkAttributes.bind( this );
		this.autocompleteRef = createRef();

		this.state = {
			attributes: props.activeAttributes,
			inputValue: '',
		};
	}

	static getDerivedStateFromProps( props, state ) {
		const { activeAttributes: { url } } = props;

		if ( ! isShowingInput( props, state ) ) {
			if ( url !== state.inputValue ) {
				return { inputValue: url };
			}
		}

		return null;
	}

	onKeyDown( event ) {
		if ( [ LEFT, DOWN, RIGHT, UP, BACKSPACE, ENTER ].indexOf( event.keyCode ) > -1 ) {
			// Stop the key event from propagating up to ObserveTyping.startTypingInTextField.
			event.stopPropagation();
		}
	}

	onChangeInputValue( inputValue ) {
		this.setState( { inputValue } );
	}

	setLinkAttributes( attributes ) {
		this.setState( {
			attributes,
		}, () => {
			// Don't apply if URL is being edited.
			if ( isShowingInput( this.props, this.state ) ) {
				return;
			}

			const {
				value,
				onChange,
				activeAttributes: {
					url,
				},
			} = this.props;

			onChange( applyFormat( value, createLinkFormat( {
				...this.state.attributes,
				url,
			} ) ) );
		} );
	}

	getLabel( opensInNewWindow ) {
		const selectedText = getTextContent( slice( this.props.value ) );

		if ( opensInNewWindow ) {
			return sprintf( __( '%s (opens in a new tab)' ), selectedText );
		}

		return selectedText;
	}

	setLinkTarget( opensInNewWindow ) {
		const { attributes = {} } = this.props;
		const label = this.getLabel( opensInNewWindow );

		if ( opensInNewWindow ) {
			let rel = 'noopener noreferrer';

			if ( attributes.rel ) {
				rel = [ rel, attributes.rel ].join( ' ' );
			}

			this.setLinkAttributes( {
				'aria-label': label,
				target: '_blank',
				rel,
				...attributes,
			} );
		} else {
			if ( typeof attributes.rel === 'string' ) {
				attributes.rel = attributes.rel.split( ' ' ).filter( ( relItem ) => {
					return relItem !== 'noopener' && relItem !== 'noreferrer';
				} ).join( ' ' ).trim();
			} else {
				delete attributes.rel;
			}

			delete attributes.target;
			attributes[ 'aria-label' ] = label;

			this.setLinkAttributes( attributes );
		}
	}

	editLink( event ) {
		this.setState( { editLink: true } );
		event.preventDefault();
	}

	submitLink( event ) {
		const { isActive, value, onChange, speak } = this.props;
		const { inputValue } = this.state;
		const url = prependHTTP( inputValue );
		const format = createLinkFormat( {
			url,
			...this.state.attributes,
		} );

		event.preventDefault();

		if ( isCollapsed( value ) && ! isActive ) {
			const toInsert = applyFormat( create( { text: url } ), format, 0, url.length );
			onChange( insert( value, toInsert ) );
		} else {
			onChange( applyFormat( value, format ) );
		}

		this.resetState();

		if ( ! isValidHref( url ) ) {
			speak( __( 'Warning: the link has been inserted but may have errors. Please test it.' ), 'assertive' );
		} else if ( isActive ) {
			speak( __( 'Link edited.' ), 'assertive' );
		} else {
			speak( __( 'Link inserted.' ), 'assertive' );
		}
	}

	onClickOutside( event ) {
		// The autocomplete suggestions list renders in a separate popover (in a portal),
		// so onClickOutside fails to detect that a click on a suggestion occurred in the
		// LinkContainer. Detect clicks on autocomplete suggestions using a ref here, and
		// return to avoid the popover being closed.
		const autocompleteElement = this.autocompleteRef.current;
		if ( autocompleteElement && autocompleteElement.contains( event.target ) ) {
			return;
		}

		this.resetState();
	}

	resetState() {
		this.props.stopAddingLink();
		this.setState( { editLink: false } );
	}

	render() {
		const { isActive, activeAttributes: { url }, addingLink, value } = this.props;

		if ( ! isActive && ! addingLink ) {
			return null;
		}

		const { inputValue } = this.state;
		const showInput = isShowingInput( this.props, this.state );
		const selectedText = getTextContent( slice( value ) );

		return (
			<PositionedAtSelection
				key={ `${ value.start }${ value.end }` /* Used to force rerender on selection change */ }
			>
				<URLPopover
					onClickOutside={ this.onClickOutside }
					onClose={ this.resetState }
					focusOnMount={ showInput ? 'firstElement' : false }
					className="editor-format-toolbar__link-settings-container"
					renderSettings={ () => (
						<div className="editor-format-toolbar__link-settings-container">
							<ToggleControl
								label={ __( 'Open in New Tab' ) }
								checked={ this.state.attributes.target === '_blank' }
								onChange={ this.setLinkTarget }
							/>
							<Slot
								name="LinkSettings"
								fillProps={ {
									url: url,
									text: selectedText,
									attributes: this.state.attributes,
									setLinkAttributes: this.setLinkAttributes,
								} }
							/>
						</div>
					) }
				>
					{ showInput ? (
						<LinkEditor
							value={ inputValue }
							onChangeInputValue={ this.onChangeInputValue }
							onKeyDown={ this.onKeyDown }
							submitLink={ this.submitLink }
							autocompleteRef={ this.autocompleteRef }
						/>
					) : (
						<LinkViewer
							url={ url }
							editLink={ this.editLink }
						/>
					) }
				</URLPopover>
			</PositionedAtSelection>
		);
	}
}

export default withSpokenMessages( InlineLinkUI );
