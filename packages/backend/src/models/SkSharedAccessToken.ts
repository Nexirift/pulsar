/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { id } from '@/models/util/id.js';
import { MiUser } from '@/models/User.js';
import { MiAccessToken } from '@/models/AccessToken.js';

@Entity('shared_access_token')
export class SkSharedAccessToken {
	@PrimaryColumn({
		...id(),
		comment: 'ID of the access token that is shared',
	})
	public accessTokenId: string;

	@ManyToOne(() => MiAccessToken, {
		onDelete: 'CASCADE',
	})
	@JoinColumn({
		name: 'accessTokenId',
		referencedColumnName: 'id',
		foreignKeyConstraintName: 'FK_shared_access_token_accessTokenId',
	})
	public accessToken: MiAccessToken;

	@Index('IDX_shared_access_token_granteeId')
	@Column({
		...id(),
		comment: 'ID of the user who is allowed to use this access token',
	})
	public granteeId: string;

	@ManyToOne(() => MiUser, {
		onDelete: 'CASCADE',
	})
	@JoinColumn({
		name: 'granteeId',
		referencedColumnName: 'id',
		foreignKeyConstraintName: 'FK_shared_access_token_granteeId',
	})
	public grantee?: MiUser;

	constructor(props?: Partial<SkSharedAccessToken>) {
		if (props) {
			Object.assign(this, props);
		}
	}
}
