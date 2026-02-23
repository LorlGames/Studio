/**
 * blockdef.js — All block definitions for Lorl Studio
 * Categories: Events, Control, Motion, Physics, Appearance,
 *             Sound, UI, Multiplayer, Math, Variables, Models, Advanced
 */

window.BlockDefs = (() => {

  const CATEGORIES = [
    {
      id: 'events', name: 'Events', color: '#f59e0b', icon: '⚡',
      blocks: [
        { id: 'on_start',       label: 'When game starts',         icon: '▶', type: 'hat',    fields: [] },
        { id: 'on_update',      label: 'Every frame',              icon: '🔄', type: 'hat',   fields: [] },
        { id: 'on_keydown',     label: 'When key pressed',         icon: '⌨️', type: 'hat',   fields: [{ type: 'key', name: 'key', default: 'Space' }] },
        { id: 'on_keyup',       label: 'When key released',        icon: '⌨️', type: 'hat',   fields: [{ type: 'key', name: 'key', default: 'Space' }] },
        { id: 'on_click',       label: 'When clicked',             icon: '🖱️', type: 'hat',   fields: [] },
        { id: 'on_collide',     label: 'On collision with',        icon: '💥', type: 'hat',   fields: [{ type: 'text', name: 'tag', default: 'Wall' }] },
        { id: 'on_trigger',     label: 'On trigger enter',         icon: '🔲', type: 'hat',   fields: [{ type: 'text', name: 'tag', default: 'Zone' }] },
        { id: 'on_message',     label: 'When message received',    icon: '📨', type: 'hat',   fields: [{ type: 'text', name: 'msg', default: 'hit' }] },
        { id: 'on_player_join', label: 'When player joins',        icon: '👋', type: 'hat',   fields: [] },
        { id: 'on_player_leave',label: 'When player leaves',       icon: '👋', type: 'hat',   fields: [] },
        { id: 'on_timer',       label: 'Every N seconds',          icon: '⏱️', type: 'hat',   fields: [{ type: 'number', name: 'sec', default: '1' }] },
        { id: 'on_overlap',     label: 'While overlapping',        icon: '🔀', type: 'hat',   fields: [{ type: 'text', name: 'tag', default: 'Pickup' }] },
      ]
    },
    {
      id: 'control', name: 'Control', color: '#8b5cf6', icon: '🔀',
      blocks: [
        { id: 'wait',     label: 'Wait seconds',    icon: '⏳', type: 'stack', fields: [{ type: 'number', name: 'sec', default: '1' }] },
        { id: 'wait_frames', label: 'Wait frames',  icon: '⏳', type: 'stack', fields: [{ type: 'number', name: 'n', default: '1' }] },
        { id: 'repeat',   label: 'Repeat N times',  icon: '🔁', type: 'c', fields: [{ type: 'number', name: 'n', default: '10' }] },
        { id: 'forever',  label: 'Forever',          icon: '♾️', type: 'c',  fields: [] },
        { id: 'if',       label: 'If',               icon: '❓', type: 'c',  fields: [{ type: 'boolean_slot', name: 'cond' }] },
        { id: 'if_else',  label: 'If / Else',        icon: '❓', type: 'c2', fields: [{ type: 'boolean_slot', name: 'cond' }] },
        { id: 'while',    label: 'While',            icon: '🔄', type: 'c',  fields: [{ type: 'boolean_slot', name: 'cond' }] },
        { id: 'break',    label: 'Break loop',        icon: '⛔', type: 'stack', fields: [] },
        { id: 'stop_all', label: 'Stop all scripts', icon: '🛑', type: 'stack', fields: [] },
        { id: 'call_func',label: 'Call function',    icon: '📞', type: 'stack', fields: [{ type: 'text', name: 'name', default: 'myFunc' }] },
        { id: 'def_func', label: 'Define function',  icon: '📝', type: 'hat',  fields: [{ type: 'text', name: 'name', default: 'myFunc' }] },
        { id: 'return',   label: 'Return',            icon: '↩️', type: 'stack', fields: [{ type: 'text', name: 'val', default: '0' }] },
      ]
    },
    {
      id: 'motion', name: 'Motion', color: '#06b6d4', icon: '🏃',
      blocks: [
        { id: 'move_forward',   label: 'Move forward by',          icon: '➡️', type: 'stack', fields: [{ type: 'number', name: 'dist', default: '1' }] },
        { id: 'set_pos',        label: 'Set position X Y Z',       icon: '📍', type: 'stack', fields: [{ type: 'number', name: 'x', default: '0' }, { type: 'number', name: 'y', default: '0' }, { type: 'number', name: 'z', default: '0' }] },
        { id: 'move_by',        label: 'Move by X Y Z',            icon: '↗️', type: 'stack', fields: [{ type: 'number', name: 'x', default: '0' }, { type: 'number', name: 'y', default: '0' }, { type: 'number', name: 'z', default: '0' }] },
        { id: 'set_rot',        label: 'Set rotation X Y Z',       icon: '↻', type: 'stack',  fields: [{ type: 'number', name: 'x', default: '0' }, { type: 'number', name: 'y', default: '0' }, { type: 'number', name: 'z', default: '0' }] },
        { id: 'rotate_by',      label: 'Rotate by X Y Z',          icon: '↺', type: 'stack',  fields: [{ type: 'number', name: 'x', default: '0' }, { type: 'number', name: 'y', default: '0' }, { type: 'number', name: 'z', default: '0' }] },
        { id: 'look_at',        label: 'Look at object',           icon: '👁️', type: 'stack', fields: [{ type: 'text', name: 'target', default: 'Player' }] },
        { id: 'glide_to',       label: 'Glide to X Y Z in secs',  icon: '🌊', type: 'stack', fields: [{ type: 'number', name: 'x', default: '0' }, { type: 'number', name: 'y', default: '0' }, { type: 'number', name: 'z', default: '0' }, { type: 'number', name: 'sec', default: '1' }] },
        { id: 'set_speed',      label: 'Set move speed',           icon: '💨', type: 'stack', fields: [{ type: 'number', name: 'spd', default: '5' }] },
        { id: 'teleport',       label: 'Teleport to spawn',        icon: '🌀', type: 'stack', fields: [] },
        { id: 'face_player',    label: 'Face nearest player',      icon: '🎯', type: 'stack', fields: [] },
        { id: 'orbit',          label: 'Orbit around object',      icon: '🔵', type: 'stack', fields: [{ type: 'text', name: 'target', default: 'Center' }, { type: 'number', name: 'radius', default: '5' }] },
      ]
    },
    {
      id: 'physics', name: 'Physics', color: '#10b981', icon: '⚙️',
      blocks: [
        { id: 'add_force',      label: 'Add force X Y Z',          icon: '💪', type: 'stack', fields: [{ type: 'number', name: 'x', default: '0' }, { type: 'number', name: 'y', default: '10' }, { type: 'number', name: 'z', default: '0' }] },
        { id: 'set_velocity',   label: 'Set velocity X Y Z',       icon: '🏹', type: 'stack', fields: [{ type: 'number', name: 'x', default: '0' }, { type: 'number', name: 'y', default: '0' }, { type: 'number', name: 'z', default: '0' }] },
        { id: 'jump',           label: 'Jump with force',           icon: '⬆️', type: 'stack', fields: [{ type: 'number', name: 'force', default: '5' }] },
        { id: 'set_gravity',    label: 'Set gravity',               icon: '🌍', type: 'stack', fields: [{ type: 'number', name: 'g', default: '-9.8' }] },
        { id: 'set_physics',    label: 'Enable physics',            icon: '⚛️', type: 'stack', fields: [{ type: 'boolean', name: 'enabled', default: 'true' }] },
        { id: 'set_mass',       label: 'Set mass',                  icon: '⚖️', type: 'stack', fields: [{ type: 'number', name: 'mass', default: '1' }] },
        { id: 'set_friction',   label: 'Set friction',              icon: '🧱', type: 'stack', fields: [{ type: 'number', name: 'f', default: '0.5' }] },
        { id: 'freeze_rot',     label: 'Freeze rotation',           icon: '🔒', type: 'stack', fields: [{ type: 'boolean', name: 'freeze', default: 'true' }] },
        { id: 'raycast',        label: 'Raycast forward dist',      icon: '🔦', type: 'stack', fields: [{ type: 'number', name: 'dist', default: '10' }] },
        { id: 'is_grounded',    label: 'Is grounded?',              icon: '🦶', type: 'bool',  fields: [] },
      ]
    },
    {
      id: 'appearance', name: 'Appearance', color: '#ec4899', icon: '🎨',
      blocks: [
        { id: 'set_color',      label: 'Set color',                 icon: '🎨', type: 'stack', fields: [{ type: 'color', name: 'color', default: '#4488ff' }] },
        { id: 'set_texture',    label: 'Set texture',               icon: '🖼️', type: 'stack', fields: [{ type: 'asset', name: 'tex', default: '' }] },
        { id: 'set_material',   label: 'Set material type',         icon: '💎', type: 'stack', fields: [{ type: 'select', name: 'mat', options: ['standard','metal','glass','emission','wireframe'], default: 'standard' }] },
        { id: 'set_emissive',   label: 'Set glow color',            icon: '✨', type: 'stack', fields: [{ type: 'color', name: 'color', default: '#ffffff' }, { type: 'number', name: 'intensity', default: '1' }] },
        { id: 'set_opacity',    label: 'Set opacity',               icon: '👻', type: 'stack', fields: [{ type: 'number', name: 'opacity', default: '1' }] },
        { id: 'set_visible',    label: 'Set visible',               icon: '👁️', type: 'stack', fields: [{ type: 'boolean', name: 'vis', default: 'true' }] },
        { id: 'set_scale',      label: 'Set scale X Y Z',           icon: '⤢', type: 'stack',  fields: [{ type: 'number', name: 'x', default: '1' }, { type: 'number', name: 'y', default: '1' }, { type: 'number', name: 'z', default: '1' }] },
        { id: 'show_shadow',    label: 'Cast shadow',               icon: '🌑', type: 'stack', fields: [{ type: 'boolean', name: 'cast', default: 'true' }] },
        { id: 'play_anim',      label: 'Play animation',            icon: '🎬', type: 'stack', fields: [{ type: 'text', name: 'anim', default: 'walk' }, { type: 'boolean', name: 'loop', default: 'true' }] },
        { id: 'stop_anim',      label: 'Stop animation',            icon: '⏹️', type: 'stack', fields: [] },
        { id: 'set_fog',        label: 'Set scene fog',             icon: '🌫️', type: 'stack', fields: [{ type: 'color', name: 'color', default: '#aabbcc' }, { type: 'number', name: 'density', default: '0.05' }] },
        { id: 'set_skybox',     label: 'Set sky color',             icon: '🌤️', type: 'stack', fields: [{ type: 'color', name: 'color', default: '#87ceeb' }] },
      ]
    },
    {
      id: 'sound', name: 'Sound', color: '#f97316', icon: '🔊',
      blocks: [
        { id: 'play_sound',     label: 'Play sound',                icon: '▶🔊', type: 'stack', fields: [{ type: 'asset', name: 'snd', default: '' }] },
        { id: 'stop_sound',     label: 'Stop sound',                icon: '⏹🔊', type: 'stack', fields: [{ type: 'asset', name: 'snd', default: '' }] },
        { id: 'play_music',     label: 'Play music (loop)',          icon: '🎵', type: 'stack', fields: [{ type: 'asset', name: 'snd', default: '' }] },
        { id: 'stop_music',     label: 'Stop music',                icon: '🔇', type: 'stack', fields: [] },
        { id: 'set_volume',     label: 'Set volume',                icon: '🔉', type: 'stack', fields: [{ type: 'number', name: 'vol', default: '1' }] },
        { id: 'play_3d',        label: 'Play 3D sound at pos',      icon: '🔈', type: 'stack', fields: [{ type: 'asset', name: 'snd', default: '' }] },
        { id: 'beep',           label: 'Beep tone Hz',              icon: '🎼', type: 'stack', fields: [{ type: 'number', name: 'hz', default: '440' }, { type: 'number', name: 'dur', default: '0.2' }] },
      ]
    },
    {
      id: 'ui', name: 'UI & HUD', color: '#84cc16', icon: '🖼',
      blocks: [
        { id: 'show_text',      label: 'Show text',                  icon: '💬', type: 'stack', fields: [{ type: 'text', name: 'msg', default: 'Hello!' }, { type: 'number', name: 'sec', default: '3' }] },
        { id: 'hud_set_text',   label: 'Set HUD text',              icon: '📝', type: 'stack', fields: [{ type: 'text', name: 'id', default: 'label1' }, { type: 'text', name: 'text', default: 'Score: 0' }] },
        { id: 'hud_show',       label: 'Show/hide HUD element',     icon: '👁️', type: 'stack', fields: [{ type: 'text', name: 'id', default: 'label1' }, { type: 'boolean', name: 'show', default: 'true' }] },
        { id: 'show_dialog',    label: 'Show dialog with button',   icon: '🗨️', type: 'stack', fields: [{ type: 'text', name: 'msg', default: 'Game Over' }, { type: 'text', name: 'btn', default: 'Restart' }] },
        { id: 'countdown',      label: 'Start countdown from',      icon: '⏱️', type: 'stack', fields: [{ type: 'number', name: 'sec', default: '60' }] },
        { id: 'screen_shake',   label: 'Screen shake',              icon: '📳', type: 'stack', fields: [{ type: 'number', name: 'intensity', default: '0.3' }, { type: 'number', name: 'dur', default: '0.5' }] },
        { id: 'set_cursor',     label: 'Set cursor style',          icon: '🖱️', type: 'stack', fields: [{ type: 'select', name: 'cur', options: ['default','crosshair','none','pointer'], default: 'default' }] },
        { id: 'lock_pointer',   label: 'Lock/unlock mouse pointer', icon: '🔒', type: 'stack', fields: [{ type: 'boolean', name: 'lock', default: 'true' }] },
      ]
    },
    {
      id: 'multiplayer', name: 'Multiplayer', color: '#06b6d4', icon: '🌐',
      blocks: [
        { id: 'send_message',   label: 'Broadcast message',         icon: '📡', type: 'stack', fields: [{ type: 'text', name: 'msg', default: 'hit' }, { type: 'text', name: 'data', default: '' }] },
        { id: 'sync_var',       label: 'Sync variable',             icon: '🔄', type: 'stack', fields: [{ type: 'text', name: 'var', default: 'score' }] },
        { id: 'get_players',    label: 'Get all players',           icon: '👥', type: 'value', fields: [] },
        { id: 'get_player_count', label: 'Player count',            icon: '#️⃣', type: 'value', fields: [] },
        { id: 'my_player_id',   label: 'My player ID',             icon: '🆔', type: 'value', fields: [] },
        { id: 'my_username',    label: 'My username',               icon: '👤', type: 'value', fields: [] },
        { id: 'is_server',      label: 'Is host/server?',           icon: '👑', type: 'bool',  fields: [] },
        { id: 'kick_player',    label: 'Kick player ID',            icon: '🚪', type: 'stack', fields: [{ type: 'text', name: 'id', default: '' }] },
        { id: 'teleport_all',   label: 'Teleport all players to spawn', icon: '🌀', type: 'stack', fields: [] },
      ]
    },
    {
      id: 'math', name: 'Math & Logic', color: '#64748b', icon: '🔢',
      blocks: [
        { id: 'math_op',        label: 'Number operation',          icon: '🔢', type: 'value', fields: [{ type: 'number', name: 'a', default: '0' }, { type: 'select', name: 'op', options: ['+','-','*','/','^','%'], default: '+' }, { type: 'number', name: 'b', default: '0' }] },
        { id: 'random',         label: 'Random between',            icon: '🎲', type: 'value', fields: [{ type: 'number', name: 'min', default: '0' }, { type: 'number', name: 'max', default: '10' }] },
        { id: 'abs',            label: 'Absolute value of',         icon: '±', type: 'value',  fields: [{ type: 'number', name: 'n', default: '0' }] },
        { id: 'round',          label: 'Round',                     icon: '○', type: 'value',  fields: [{ type: 'number', name: 'n', default: '0' }] },
        { id: 'clamp',          label: 'Clamp between min max',     icon: '⊂', type: 'value',  fields: [{ type: 'number', name: 'val', default: '0' }, { type: 'number', name: 'min', default: '0' }, { type: 'number', name: 'max', default: '100' }] },
        { id: 'compare',        label: 'Compare',                   icon: '⚖️', type: 'bool',  fields: [{ type: 'number', name: 'a', default: '0' }, { type: 'select', name: 'op', options: ['=','≠','<','>','≤','≥'], default: '=' }, { type: 'number', name: 'b', default: '0' }] },
        { id: 'and',            label: 'And',                       icon: '&&', type: 'bool',  fields: [{ type: 'boolean_slot', name: 'a' }, { type: 'boolean_slot', name: 'b' }] },
        { id: 'or',             label: 'Or',                        icon: '||', type: 'bool',  fields: [{ type: 'boolean_slot', name: 'a' }, { type: 'boolean_slot', name: 'b' }] },
        { id: 'not',            label: 'Not',                       icon: '!', type: 'bool',   fields: [{ type: 'boolean_slot', name: 'a' }] },
        { id: 'distance',       label: 'Distance to object',        icon: '📏', type: 'value', fields: [{ type: 'text', name: 'obj', default: 'Player' }] },
        { id: 'lerp',           label: 'Lerp from to t',            icon: '〰️', type: 'value', fields: [{ type: 'number', name: 'a', default: '0' }, { type: 'number', name: 'b', default: '1' }, { type: 'number', name: 't', default: '0.5' }] },
      ]
    },
    {
      id: 'variables', name: 'Variables', color: '#dc2626', icon: '📦',
      blocks: [
        { id: 'set_var',        label: 'Set variable',              icon: '=', type: 'stack',  fields: [{ type: 'text', name: 'name', default: 'myVar' }, { type: 'text', name: 'val', default: '0' }] },
        { id: 'change_var',     label: 'Change variable by',        icon: '±', type: 'stack',  fields: [{ type: 'text', name: 'name', default: 'score' }, { type: 'number', name: 'by', default: '1' }] },
        { id: 'get_var',        label: 'Get variable',              icon: '📥', type: 'value', fields: [{ type: 'text', name: 'name', default: 'myVar' }] },
        { id: 'get_prop',       label: 'Get object property',       icon: '🔍', type: 'value', fields: [{ type: 'text', name: 'obj', default: 'Player' }, { type: 'select', name: 'prop', options: ['x','y','z','rotX','rotY','rotZ','health','visible'], default: 'x' }] },
        { id: 'set_prop',       label: 'Set object property',       icon: '✏️', type: 'stack', fields: [{ type: 'text', name: 'obj', default: 'Player' }, { type: 'select', name: 'prop', options: ['x','y','z','rotX','rotY','rotZ','health','visible'], default: 'x' }, { type: 'text', name: 'val', default: '0' }] },
        { id: 'list_add',       label: 'Add to list',               icon: '➕', type: 'stack', fields: [{ type: 'text', name: 'list', default: 'items' }, { type: 'text', name: 'val', default: '0' }] },
        { id: 'list_get',       label: 'Item N of list',            icon: '📋', type: 'value', fields: [{ type: 'text', name: 'list', default: 'items' }, { type: 'number', name: 'i', default: '0' }] },
        { id: 'list_length',    label: 'Length of list',            icon: '#️⃣', type: 'value', fields: [{ type: 'text', name: 'list', default: 'items' }] },
      ]
    },
    {
      id: 'models', name: 'Models & Shapes', color: '#7c3aed', icon: '🧊',
      blocks: [
        { id: 'spawn_object',   label: 'Spawn object at pos',       icon: '✨', type: 'stack', fields: [{ type: 'text', name: 'template', default: 'Cube' }, { type: 'number', name: 'x', default: '0' }, { type: 'number', name: 'y', default: '0' }, { type: 'number', name: 'z', default: '0' }] },
        { id: 'destroy_self',   label: 'Destroy this object',       icon: '💥', type: 'stack', fields: [] },
        { id: 'destroy_obj',    label: 'Destroy object',            icon: '💥', type: 'stack', fields: [{ type: 'text', name: 'name', default: 'Enemy' }] },
        { id: 'clone_obj',      label: 'Clone object',              icon: '📋', type: 'stack', fields: [{ type: 'text', name: 'name', default: 'Enemy' }] },
        { id: 'find_obj',       label: 'Find object named',         icon: '🔍', type: 'value', fields: [{ type: 'text', name: 'name', default: 'Coin' }] },
        { id: 'find_tag',       label: 'Find all with tag',         icon: '🏷️', type: 'value', fields: [{ type: 'text', name: 'tag', default: 'Enemy' }] },
        { id: 'set_tag',        label: 'Set object tag',            icon: '🏷️', type: 'stack', fields: [{ type: 'text', name: 'tag', default: 'Enemy' }] },
        { id: 'set_shape',      label: 'Change shape',              icon: '📐', type: 'stack', fields: [{ type: 'select', name: 'shape', options: ['cube','sphere','cylinder','cone','capsule','plane','torus'], default: 'cube' }] },
        { id: 'set_size',       label: 'Set size W H D',            icon: '⤢', type: 'stack',  fields: [{ type: 'number', name: 'w', default: '1' }, { type: 'number', name: 'h', default: '1' }, { type: 'number', name: 'd', default: '1' }] },
        { id: 'load_model',     label: 'Load 3D model',             icon: '📦', type: 'stack', fields: [{ type: 'asset', name: 'model', default: '' }] },
        { id: 'attach_to',      label: 'Attach to parent',          icon: '🔗', type: 'stack', fields: [{ type: 'text', name: 'parent', default: 'Player' }] },
        { id: 'detach',         label: 'Detach from parent',        icon: '🔓', type: 'stack', fields: [] },
        { id: 'emit_particles', label: 'Emit particle effect',      icon: '✨', type: 'stack', fields: [{ type: 'select', name: 'fx', options: ['explosion','fire','smoke','sparks','stars','confetti'], default: 'explosion' }, { type: 'number', name: 'count', default: '20' }] },
      ]
    },
    {
      id: 'advanced', name: 'Advanced', color: '#374151', icon: '⚗️',
      blocks: [
        { id: 'run_code',       label: 'Run JavaScript',            icon: '{ }', type: 'stack', fields: [{ type: 'textarea', name: 'code', default: 'console.log("hello")' }] },
        { id: 'http_get',       label: 'HTTP GET url',              icon: '🌐', type: 'stack', fields: [{ type: 'text', name: 'url', default: 'https://api.example.com' }, { type: 'text', name: 'var', default: 'response' }] },
        { id: 'json_parse',     label: 'Parse JSON string',         icon: '📄', type: 'value', fields: [{ type: 'text', name: 'str', default: '{}' }] },
        { id: 'json_get',       label: 'Get JSON key',              icon: '🔑', type: 'value', fields: [{ type: 'text', name: 'obj', default: 'data' }, { type: 'text', name: 'key', default: 'name' }] },
        { id: 'local_storage_set', label: 'Save to local storage', icon: '💾', type: 'stack', fields: [{ type: 'text', name: 'key', default: 'save' }, { type: 'text', name: 'val', default: '0' }] },
        { id: 'local_storage_get', label: 'Load from local storage',icon: '💿', type: 'value', fields: [{ type: 'text', name: 'key', default: 'save' }] },
        { id: 'print',          label: 'Print to console',          icon: '🖨️', type: 'stack', fields: [{ type: 'text', name: 'msg', default: 'debug' }] },
        { id: 'alert',          label: 'Alert popup',               icon: '⚠️', type: 'stack', fields: [{ type: 'text', name: 'msg', default: 'Hello' }] },
        { id: 'open_url',       label: 'Open URL',                  icon: '🔗', type: 'stack', fields: [{ type: 'text', name: 'url', default: 'https://' }] },
      ]
    },
  ];

  // Keyboard key options
  const KEY_OPTIONS = [
    'Space','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
    'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',
    '0','1','2','3','4','5','6','7','8','9',
    'Shift','Control','Alt','Tab','Escape','Backspace','Delete',
    'F1','F2','F3','F4','F5',
  ];

  return { CATEGORIES, KEY_OPTIONS };
})();
