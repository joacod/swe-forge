# Shared validation for the adapter registry.
#
# Keep registry shape and path rules in one place so the installer and the
# repository checker cannot silently disagree about what a row means.

swe_forge_registry_path_is_safe() {
  swe_forge_registry_path=$1

  [ -n "$swe_forge_registry_path" ] || return 1
  case "$swe_forge_registry_path" in
    -) return 0 ;;
    /*|*/) return 1 ;;
  esac

  case "/$swe_forge_registry_path/" in
    */./*|*/../*) return 1 ;;
  esac

  case "$swe_forge_registry_path" in
    *'|'*) return 1 ;;
  esac

  return 0
}

swe_forge_registry_row_is_valid() {
  swe_forge_registry_harness=$1
  swe_forge_registry_kind=$2
  swe_forge_registry_source=$3
  swe_forge_registry_destination=$4
  swe_forge_registry_support=$5

  [ -n "$swe_forge_registry_harness" ] || return 1

  case "$swe_forge_registry_kind" in
    file|tree)
      [ "$swe_forge_registry_source" != - ] || return 1
      ;;
    *)
      return 1
      ;;
  esac

  [ "$swe_forge_registry_destination" != - ] || return 1
  swe_forge_registry_path_is_safe "$swe_forge_registry_source" || return 1
  swe_forge_registry_path_is_safe "$swe_forge_registry_destination" || return 1

  if [ "$swe_forge_registry_support" != - ]; then
    swe_forge_registry_path_is_safe "$swe_forge_registry_support" || return 1
  fi

  return 0
}
