/**
 * External dependencies
 */
import { noop } from 'lodash';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { RawHTML } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { Button, IconButton } from '../';

function Notice( {
	className,
	status,
	children,
	onRemove = noop,
	isDismissible = true,
	actions = [],
	__unstableHTML,
} ) {
	const classes = classnames( className, 'components-notice', 'is-' + status, {
		'is-dismissible': isDismissible,
	} );

	if ( __unstableHTML ) {
		children = <RawHTML>{ children }</RawHTML>;
	}

	return (
		<div className={ classes }>
			<div className="components-notice__content">
				{ children }
				{ actions.map(
					(
						{
							className: buttonAdditionalClass,
							label,
							onClick,
							url,
						},
						index
					) => {
						return (
							<Button
								key={ index }
								href={ url }
								isDefault={ ! url }
								isLink={ !! url }
								onClick={ url ? undefined : onClick }
								className={ classnames(
									'components-notice__action',
									buttonAdditionalClass
								) }
							>
								{ label }
							</Button>
						);
					}

				) }
			</div>
			{ isDismissible && (
				<IconButton
					className="components-notice__dismiss"
					icon="no"
					label={ __( 'Dismiss this notice' ) }
					onClick={ onRemove }
					tooltip={ false }
				/>
			) }
		</div>
	);
}

export default Notice;
