export function normalizeUserProfile(user, options = {}) {
	if (!user) {
		return null;
	}

	const { fallbackAvatarUrl, fallbackFullName } = options;

	const avatarCandidates = [
		user.avatar,
		user.avatarUrl,
		user.avatarURL,
		user.photo,
		user.photoUrl,
		user.photoURL,
		user.picture,
		user.pictureUrl,
		user.image,
		user.imageUrl,
		user.imageURL,
		user.profileImage,
		user.profilePicture,
		user.googleAvatar,
		fallbackAvatarUrl,
	];

	const normalized = { ...user };

	const resolvedAvatar = avatarCandidates.find(
		(value) => typeof value === "string" && value.trim().length > 0
	);

	if (resolvedAvatar) {
		normalized.avatar = resolvedAvatar;
	}

	const resolvedFullName =
		user.fullName ||
		user.name ||
		user.username ||
		fallbackFullName ||
		(user.email ? user.email.split("@")[0] : "");

	if (!normalized.fullName && resolvedFullName) {
		normalized.fullName = resolvedFullName;
	}

	return normalized;
}
