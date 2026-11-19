import { ALL_SPECIES, SPECIES, type SpeciesId } from '../data/monsters';
import { fracWords, SPOKEN_BOTTOMS, type Frac } from '../math/fractions';
import { STICKERS } from '../rewards';
import { capital, numberRecordings, spoken } from './numbers';

/**
 * Every line the game speaks. Each entry is recorded once as an audio clip
 * (public/voice/<key>.m4a). Sentences with a name or a number are built from
 * pieces: a name clip, a phrase clip, a number clip. Phrases are written so
 * the pieces sit at natural pauses.
 */
export const LINES = {
  // first run
  welcome: 'Welcome to Monster Meadow! Three little monsters want a friend. Who do you pick?',
  q_place: 'Your friend is hungry! Each crate holds ten berries. How many berries are here?',
  q_add: 'Your friend has twenty-three berries. Here come fourteen more. How many now?',
  q_addR: 'Your friend has twenty-seven berries. Here come fifteen more. How many now?',
  q_sub: 'Your friend has forty-six berries, and eats twelve. How many are left?',
  q_subR: 'Your friend has fifty-two berries, and eats twenty-seven. How many are left?',
  q_array: 'Look at the rows of berries. Which one matches the picture?',
  q_share: 'Twelve berries, shared by three friends. Which one matches the picture?',
  m_hello: 'You have a new friend! Tap your friend to say hello.',
  m_name: 'Does your friend need a new name? Type one, or keep this one.',
  m_feed: 'Your friend is hungry! Tap the berries to feed your friend.',
  m_more2: 'Nice. Now let us see what you two can do together.',
  m_break2: 'Quick break! Give your partner a high five.',
  i_intro2: 'Answer what you can. If you are not sure, that is okay. Just press, Not sure.',
  i_next2: 'Nice. Next round!',
  i_count: 'How many berries?',
  i_carts: 'A cart holds one hundred berries. A crate holds ten. How many berries are here?',
  i_bigger: 'Which number is bigger?',
  i_in_all: 'How many berries in all?',
  i_what_make: 'What does this make?',
  i_missing: 'Which number is missing?',
  i_each: 'The berries are shared equally. How many does each friend get?',
  i_match_groups: 'Look at the groups of berries. Which one matches the picture?',
  i_frac_part: 'How much of the bar is purple?',
  i_frac_bigger: 'Which one is bigger?',
  i_frac_same: 'Which one is the same amount?',
  got1: 'Thanks!',
  got2: 'Got it!',
  got3: 'Okay!',
  got4: 'Next one!',
  got5: 'Noted!',
  thats_okay: 'That is okay!',
  first_friend: 'You made your first friend! Now let us go find more monsters.',

  // meadow
  home_tip: 'This is your meadow. Something is hiding in the tall grass. Go and say hi!',
  egg_ready: 'Your egg is ready to hatch! Tap it!',
  egg_cold: 'Your egg needs to get warm. Every right answer warms it up.',
  egg_hatched: 'Your egg hatched! Say hello to your new friend!',
  wants_play: 'This friend wants to play with you today!',
  day_done2: 'That is all of today done! Your first partner earned a bonus star. Come back tomorrow for more.',
  no_berries: 'No berries left. Play a game to earn more!',
  new_buddy: 'This is your buddy now! Your buddy helps you, and teaches you new things.',
  all_full: 'So full! No more berries today.',
  who_is_it: 'Who could it be? Go and look!',
  met_this: 'You met this one. Keep going to make friends!',
  t_wish: 'Wish granted!',
  t_bond: 'You are closer friends now!',
  t_level: 'Ranger level up!',
  t_egg: 'You got a mystery egg!',
  t_sticker: 'New sticker!',

  // treats
  wild2_any: 'A wild monster!',
  wild2_add: 'A wild monster! It loves plus treats.',
  wild2_sub: 'A wild monster! It loves minus treats.',
  wild2_mul: 'A wild monster! It loves times treats.',
  wild2_div: 'A wild monster! It loves sharing treats.',
  lets_play: 'Let us play!',
  how_to: 'Pick a number, then a sign, then another number.',
  already: 'You found that one already. Try a new one!',
  easy_again: 'True! But your friend has had that kind of easy treat.',
  flip: 'A flip! Same parts, other way round.',
  flip_have: 'True! That is a flip of one you have.',
  tired2_add: 'That works. But that is a lot of plus treats. Try another kind!',
  tired2_sub: 'That works. But that is a lot of minus treats. Try another kind!',
  tired2_mul: 'That works. But that is a lot of times treats. Try another kind!',
  tired2_div: 'That works. But that is a lot of sharing treats. Try another kind!',
  easy_one: 'True! That is the easy one. Can you make a trickier treat?',
  bigger_parts: 'True! Now try bigger parts.',
  nice1: 'Nice one!',
  nice2: 'Great treat!',
  nice3: 'Good thinking!',
  nice4: 'That works!',
  double2: 'A double! Nice!',
  round_number: 'A round number. Smart!',
  new_kind: 'A new kind of treat!',
  almost_add: 'Almost ready! This monster loves plus treats. Make one with plus.',
  almost_sub: 'Almost ready! This monster loves minus treats. Make one with minus.',
  almost_mul: 'Almost ready! This monster loves times treats. Make one with times.',
  almost_div: 'Almost ready! This monster loves sharing treats. Make one with the share sign.',
  zero_groups: 'You cannot share into zero groups. Try another number.',
  not_even: 'That does not share evenly. Some are left over.',
  too_much_away: 'That takes away too much.',
  too_many: 'That is too many.',
  not_enough: 'That is not enough.',
  not_it: 'Not that one. Look at the bars and try again.',
  hint_add: 'Start with this number. How many more do you need?',
  hint_sub: 'Start with this number. How many do you take away?',
  hint_mul: 'Look at the rows of berries. How many are in each row?',
  hint_div: 'Look at the groups of berries. How many groups are there?',
  no_hint: 'You found so many! Try any numbers you like.',
  keep_going: 'Keep going! Your friend still wants treats.',
  together: 'We did that one together.',
  turn_add: 'Your turn! Make one more with plus, all by yourself, with new numbers.',
  turn_sub: 'Your turn! Make one more with minus, all by yourself, with new numbers.',
  turn_mul: 'Your turn! Make one more with times, all by yourself, with new numbers.',
  turn_div: 'Your turn! Make one more with sharing, all by yourself, with new numbers.',
  turn_any: 'Your turn! Make one more your own way, all by yourself, with new numbers.',
  solo_yes: 'You did it all by yourself! Bonus hearts!',
  new_friend: 'You made a new friend!',
  got_star: 'Your friend got a star!',
  grew_up: 'Your friend grew up! Look how big and strong!',
  full_today: 'That was so much fun! Your friend is full of stars for today. More stars tomorrow!',
  // a match, in turns: her move takes the other monster's power away; her block adds to her shield
  mt_invite: 'This friend wants a match with your buddy!',
  mt_start: 'A match! Take away their power with your moves.',
  mt_power: 'Their power is:',
  mt_takes: 'Your move takes away:',
  mt_left: 'How much power is left?',
  mt_breath: 'They catch their breath.',
  mt_attack: 'They attack! Block it!',
  mt_shield: 'Your shield is:',
  mt_block: 'A good block adds:',
  mt_shield_now: 'How much shield now?',
  mt_hit: 'Yes! It hit!',
  mt_blocked: 'Yes! Blocked!',
  mt_miss: 'The move missed. Look at the bar, and try again.',
  mt_not_yet: 'Not yet. Look at the bar, and try again.',
  mt_steps: 'Take it in small steps. Tens first, then ones.',
  mt_copy: 'Let me show you. Type the answer you see.',
  mt_finish: 'Your power move is ready! Press the power button.',
  mt_won: 'You won the match! Good game!',
  // the signs of a written sum, for reading it out: "seventy, minus, forty-seven"
  op_plus: 'Plus.',
  op_minus: 'Minus.',

  // berry canyon
  how_many_now: 'How many now?',
  how_many_left: 'How many are left?',
  tip_add: 'Put the berries together. Then count the crates and the loose berries.',
  tip_sub: 'Click the berries to feed your friend. Then count what is left.',
  so_many_loose: 'So many loose berries! Ten fit in a crate. Pack a crate.',
  now_count: 'Now count the crates and the loose berries.',
  packed: 'Packed! Ten berries made one new crate. Now count.',
  made_cart: 'Ten crates made one cart. That is one hundred!',
  packed_back: 'Packed back into a crate. Now count what is left.',
  opened: 'One crate opened. Now there are ten more loose berries.',
  is_full: 'Your friend is full. Count what is left.',
  crate_too_much: 'A whole crate is too much. Open a crate to get loose berries.',
  all_eaten: 'All eaten! How many are left? Count them.',
  need_open: 'No loose berries left. Open a crate!',
  c_no_carry: 'Look at the loose berries. Ten of them fit in a crate. Pack a crate, then count again.',
  c_need_open: 'There are not enough loose berries. Open a crate to get more.',
  c_reversed: 'So close! Check which number is crates, and which is loose berries.',
  c_grows: 'More berries are coming, so the pile grows. Put them together.',
  c_shrinks: 'Your friend is eating berries, so the pile shrinks. Feed your friend, and count what is left.',
  c_off_one: 'So close! Count the berries one more time.',
  c_off_ten: 'So close! Count the crates one more time.',
  c_other: 'Not yet. Let us use the berries to find out.',
  c_count: 'Not yet. Count the crates, then the loose berries.',
  c_together: 'Not yet. Put the berries together and count.',
  c_here: 'Not yet. Here are the berries to help.',
  yes: 'Yes! You got it!',

  // taught lessons
  l_intro: 'Time for a tiny lesson. Watch me first!',
  l_try: 'Not quite. Look at the picture, and try again.',
  l_show_answer: 'Here is the answer. Look at the picture, and count with me.',
  l_parts_1: 'Every number is made of parts. Here is twelve.',
  l_parts_2: 'I can break it into ten and two. Ten plus two makes twelve.',
  l_parts_3: 'Or six and six. A double!',
  l_parts_4: 'I can also start bigger, and take some away. Fifteen minus three.',
  l_parts_5: 'Your turn. Seven, and how many more, to make twelve?',
  l_parts_6: 'Monsters love treats with real parts. Plus zero is true, but it is the easy one. Try bigger parts!',
  l_pack_1: 'Watch me add. Twenty-seven berries, and fifteen more.',
  l_pack_2: 'I put them together. Three crates, and twelve loose berries. That is too many loose ones!',
  l_pack_3: 'Ten loose berries fit in one crate. I pack ten. Now there are four crates, and two loose berries.',
  l_pack_4: 'Four crates and two loose berries is forty-two.',
  l_pack_5: 'Your turn. Thirty-six and eighteen. Too many loose berries. Press, pack ten.',
  l_pack_6: 'How many berries now? Count the crates, then the loose ones.',
  l_pack_7: 'You packed a crate! Grown-ups call that regrouping.',
  l_open_1: 'Watch me take away. Fifty-two berries. My friend eats twenty-seven.',
  l_open_2: 'First the crates. Two crates gone.',
  l_open_3: 'Now seven loose berries. But there are only two! So I open a crate.',
  l_open_4: 'Now I can take seven. Two crates and five loose berries are left. Twenty-five.',
  l_open_5: 'Your turn. Forty-three, take away eighteen. One crate is gone. Now eight loose berries, but there are only three. Press, open a crate.',
  l_open_6: 'Now eight can go. How many berries are left? Count the crates, then the loose ones.',
  l_open_7: 'You opened a crate! That is how to take away when there are not enough loose ones.',
  l_rows_1: 'Look. Berries in rows. Three rows, with four berries in each row.',
  l_rows_2: 'I could count four, and four, and four. That is twelve.',
  l_rows_3: 'A faster way to say it: three times four. Three rows of four makes twelve.',
  l_rows_4: 'Turn it around: four rows of three. Still twelve! Four times three is the same as three times four.',
  l_rows_5: 'Your turn. Two rows of five. Which treat matches?',
  l_rows_6: 'How many berries is two times five?',
  l_rows_7: 'That is multiplication: equal rows.',
  l_share_1: 'Twelve berries, and three friends. Everyone gets the same.',
  l_share_2: 'I share them out, one each, until they are gone. Each friend gets four.',
  l_share_3: 'We say: twelve divided by three is four.',
  l_share_4: 'Look, it is the rows again! Three rows of four is twelve. Sharing is times, backwards.',
  l_share_5: 'Your turn. Ten berries, two friends. Which treat matches?',
  l_share_6: 'How many does each friend get?',
  l_share_7: 'That is division: sharing equally.',

  // step-by-step help on the problem in front of her
  show_you: 'Let me show you.',
  w_add: 'Let us do it together. First, put the berries together.',
  w_pack: 'More than nine loose berries. Ten of them go in a crate.',
  w_sub: 'Let us do it together. First, feed the crates.',
  w_open: 'Not enough loose berries. So we open a crate.',
  w_feed: 'Now feed the loose berries.',
  w_count: 'Now count. Crates first, then the loose berries. Pick the numbers below.',
  help_hint: 'Here is a little help.',

  // honey hollow: fractions
  hollow_tip: 'Welcome to Honey Hollow! The monsters here love honey bars, cut into equal pieces.',
  wild_honey: 'A wild monster! It loves honey.',
  fq_name: 'How much of the honey bar is gold? Pick how many pieces are gold, and how many pieces there are in all.',
  fq_name_s: 'How much of the bar is gold?',
  fq_build: 'Fill the honey bar to make this fraction.',
  fq_build_cut: 'First cut the bar into equal pieces. Then fill it to make this fraction.',
  fq_compare: 'Which bar has more honey? Or are they the same?',
  fq_match: 'Fill the bottom bar, so it has the same amount of honey as the top bar.',
  fq_times: 'Your friend eats the same piece of honey bar every day. How much is that in all? Press, add a piece, to find out.',
  fq_times_s: 'How much honey in all?',
  fq_tray: 'Your friend wants a piece of a piece. First cut the tray one way. Then cut it the other way.',
  fq_tray_s: 'How much of the whole tray is that?',
  f_all_pieces: 'All the pieces are down. Count them. The pieces are still the same size.',
  f_tray_cut1: 'That is the first piece, in gold. Now take a part of the gold.',
  f_tray_cut2: 'The dark gold is the piece of the piece. Count the dark pieces. Then count all the small pieces in the tray.',
  f_count_with_me: 'Let us count together. The gold pieces go on top. The pieces in one whole go on the bottom.',
  f_tap_glow: 'Let me help. Tap the pieces that glow.',
  f_same_yes: 'Yes! Different pieces, same amount.',
  f_show_bars: 'Here are the bars to help.',
  fc_swapped: 'So close! The bottom number is how many pieces in all. The top number is how many are gold.',
  fc_empty: 'Count the gold pieces, not the empty ones.',
  fc_partpart: 'The bottom number counts all the pieces, gold and empty together.',
  fc_count: 'Not yet. Count the pieces in the whole bar. Then count the gold ones.',
  fc_cuts: 'Look at the bottom number. That is how many equal pieces the bar needs.',
  fc_fill: 'Look at the top number. That is how many pieces to fill.',
  fc_bigger_bottom: 'A bigger bottom number means more cuts. More cuts make smaller pieces.',
  fc_look_bars: 'Not yet. Look at how far the gold goes in each bar.',
  fc_match: 'Not yet. Make the gold go just as far as in the top bar.',
  fc_times_both: 'The pieces stay the same size, so the bottom number stays the same. Only the top number grows.',
  fc_times_added: 'It is times, not plus. Count every piece you put down.',
  fc_times_other: 'Not yet. Put the pieces down, and count them.',
  fc_tray_added: 'Do not add the bottom numbers. Count all the small pieces in the whole tray.',
  fc_tray_one: 'That is only one of the two cuts. Cut the tray both ways, and count.',
  fc_tray_other: 'Not yet. Cut the tray both ways. Then count the dark pieces, and all the small pieces.',
  l_frac_1: 'Here is one whole honey bar.',
  l_frac_2: 'I cut it into four equal pieces. Every piece is the same size.',
  l_frac_3: 'I fill one piece with honey. That is one fourth of the bar.',
  l_frac_4: 'The bottom number says how many equal pieces are in the whole bar. The top number says how many are gold.',
  l_frac_5: 'Now three pieces are gold. Three fourths.',
  l_frac_6: 'Your turn. How many equal pieces are in this whole bar?',
  l_frac_7: 'And how many pieces are gold?',
  l_frac_8: 'Two thirds! Two gold pieces, out of three.',
  l_same_1: 'This honey bar is cut in two. One half is gold.',
  l_same_2: 'This bar is the same size, but cut in four. Two fourths are gold.',
  l_same_3: 'Look! The gold goes just as far. One half, and two fourths, are the same amount.',
  l_same_4: 'Now one half, and one fourth. Four is a bigger number than two. But one fourth is a smaller piece!',
  l_same_5: 'More cuts make smaller pieces.',
  l_same_6: 'Your turn. Which one is more honey?',
  l_same_7: 'Yes. Thirds are bigger pieces than sixths.',
  l_ftimes_1: 'My friend eats one fourth of a honey bar every day.',
  l_ftimes_2: 'After two days, that is two pieces. Two fourths.',
  l_ftimes_3: 'After three days, three pieces. Three times one fourth is three fourths.',
  l_ftimes_4: 'The pieces stay the same size, so the bottom number stays the same. Only the top number grows.',
  l_ftimes_5: 'Five days is five pieces. That is more than one whole bar!',
  l_ftimes_6: 'Your turn. Two times one third. How many pieces are gold?',
  l_ftimes_7: 'Two thirds. Two pieces, and each piece is one third.',
  l_ftray_1: 'Here is a whole tray of honey. I cut it into three equal strips, and fill one. One third.',
  l_ftray_2: 'My friend wants half of that third. So I cut the tray across, into two.',
  l_ftray_3: 'Half of the gold strip is this one small, dark piece.',
  l_ftray_4: 'How big is it? Count all the small pieces in the tray. Six. So it is one sixth.',
  l_ftray_5: 'Your turn. Half of one fourth. How many small pieces are in the whole tray?',
  l_ftray_6: 'One half of one fourth is one eighth. A piece of a piece is a smaller piece.',

  // growing with her
  stretch_try: 'Ooh, a tricky one! Give it a try. If it is too hard, we will do it together.',
  stretch_yes: 'Wow! That was a tricky one, and you got it!',
  stretch_miss: 'That one was extra tricky. Let us look at it together.',
  t_harder: 'You are getting stronger! The problems grow with you.',
  t_best: 'Level up! Your friend gets a bonus star.',
  gate_tip: 'A new monster is watching you! Play a bit more with your friends, and it will come out.',

  // shop, decorations, bedtime
  shop_tip: 'Spend your berries here! Charms are for your monsters. Decorations go in your meadow.',
  shop_bought: 'Got it! It is yours now.',
  shop_poor: 'Not enough berries yet. Play to earn more!',
  decor_tip: 'Your new decoration is in the meadow. Drag it to where you want it.',
  charm_tip: 'You got a charm! Tap a friend in the meadow, and press Charm, to put it on.',
  charm_on: 'Looking good!',
  night_tip: 'When you are done playing, press Good night, to tuck everyone in.',
  good_night: 'Good night, everyone! See you tomorrow.',
  wake_up: 'Rise and shine! Everyone is awake.',

  // early numbers: counting, comparing, making ten, tens and ones
  early_tip: 'These berries need counting! Tap a berry when you count it.',
  eq_give: 'Fill the basket. Put in this many berries.',
  eq_more: 'Which pile has more berries?',
  eq_fewer: 'Which pile has fewer berries?',
  eq_fill5: 'How many more berries make five?',
  eq_fill10: 'A crate holds ten berries. How many more fill the crate?',
  eq_pair: 'How many more make ten?',
  eq_teen: 'One full crate, and some loose berries. How many berries in all?',
  eq_split: 'Ten berries go in a crate. How many loose berries are left?',
  eq_read: 'Each crate holds ten berries. How many berries are here?',
  eq_build: 'Make this number, with crates and loose berries.',
  eq_more10: 'What is ten more than this number?',
  eq_less10: 'What is ten less than this number?',
  eh_count: 'Let us count together. Touch each berry once.',
  eh_basket: 'Count each berry as it goes in the basket.',
  eh_line: 'Here they are, side by side. Which row goes further?',
  eh_crates_first: 'Look at the crates first. More crates is more.',
  eh_empty: 'Count the empty spots.',
  eh_count_on: 'The crate is ten. Count on from ten.',
  eh_places: 'Count the crates. Then count the loose berries.',
  eh_crate_more: 'Ten more is one more crate. The loose berries stay the same.',
  eh_crate_less: 'Ten less is one crate less. The loose berries stay the same.',
  ec_slip: 'So close! Touch each berry once as you count.',
  ec_line_up: 'Line them up, side by side. Which one goes further?',
  ec_fewer: 'Fewer means not as many. Look again.',
  ec_there: 'Those are the berries that are there. Count the empty spots.',
  ec_whole: 'That is how many fit in all. Count only the ones that are missing.',
  ec_crate_ten: 'A crate holds ten berries. Count the crate as ten, then count on.',
  ec_reversed: 'So close! Crates come first, then the loose berries.',
  show_you_look: 'Let me show you. Look, then press Check.',
  l_count_1: 'Here are some berries. I touch each one, and say one number.',
  l_count_2: 'One. Two. Three. Four. Five.',
  l_count_3: 'The last number I say is how many there are. Five berries.',
  l_count_4: 'It does not matter which berry I start with. It is still five.',
  l_count_5: 'Your turn. Count each berry once. How many are there?',
  l_count_6: 'Seven! The last number you say is how many.',
  l_more_1: 'Two piles of berries. Which has more?',
  l_more_2: 'I line them up, side by side.',
  l_more_3: 'This row goes further. Six is more than four.',
  l_more_4: 'The other row has fewer. Fewer means not as many.',
  l_more_5: 'Your turn. Which is more?',
  l_more_6: 'Yes. Eight is more than five.',
  l_ten_1: 'A crate holds ten berries. This crate has six.',
  l_ten_2: 'I count the empty spots. One. Two. Three. Four.',
  l_ten_3: 'Six and four make ten.',
  l_ten_4: 'Here is a full crate, and three loose berries. Ten, and three more, is thirteen.',
  l_ten_5: 'Your turn. This crate has seven. How many more fill it?',
  l_ten_6: 'Seven and three make ten.',
  l_place_1: 'Each crate holds ten berries. Three crates. Ten, twenty, thirty.',
  l_place_2: 'And four loose berries. Thirty-four.',
  l_place_3: 'The first number says how many crates. The second number says how many loose berries.',
  l_place_4: 'Four crates and three loose berries is forty-three. The same two numbers, but a different amount!',
  l_place_5: 'Your turn. How many berries? Count the crates first.',
  l_place_6: 'Twenty-six. Two crates, and six loose berries.',

  // the bakery: big trays, fair shares, slices, crumbs
  upper_tip: 'Welcome to the Bakery! The monsters here love warm buns.',
  uq_mult: 'Buns in equal rows. How many buns in all?',
  uq_div: 'Share the buns fairly. How many go in each basket?',
  uq_div_left: 'Share the buns fairly. How many in each basket? And how many are left?',
  uq_fadd: 'Put the slices together. How much of a loaf is that?',
  uq_fsub: 'Some slices get eaten. How much of the loaf is left?',
  uq_dec_read: 'A full tray is one. How much is here?',
  uq_dec_more: 'Which one is more?',
  uq_dec_add: 'Put them together. How much in all?',
  uq_dec_sub: 'Some gets eaten. How much is left?',
  uh_mult: 'Look. Each part of the tray shows its buns. Add the parts.',
  uh_div: 'Look. Every basket gets the same. Count one basket.',
  uh_div_parts: 'Share the big part first. Then share the rest.',
  uh_slices: 'The slices are the same size now. Count them.',
  uh_slices_left: 'The crossed slices are eaten. Count what is left.',
  uh_dec_read: 'A strip is one tenth. A small square is one hundredth.',
  uh_dec_more: 'Look at the trays. Which one is fuller?',
  uh_dec_sum: 'Ten strips fill a tray. Count the full trays first, then the strips.',
  uh_dec_left: 'The crossed squares are eaten. Count what is left.',
  uh_cut: 'Cut! Now the slices are the same size.',
  uc_tens: 'So close! Those are tens. Look at the trays of ten again.',
  uc_rows: 'These are equal rows. That is times, not plus.',
  uc_part: 'One part is not right yet. Look at that part again.',
  uc_total: 'The parts are right! Add them up one more time.',
  uc_leftover: 'That is how many are left. How many are in each basket?',
  uc_left_big: 'You can still share those. Every basket can get one more.',
  uc_share: 'We are sharing. Each basket gets less than the whole pile.',
  uc_basket: 'So close! Count one basket again.',
  uc_bottoms: 'The slices stay the same size. Only the top numbers are added.',
  uc_recut: 'The slices are not the same size yet. Cut the loaf to match first.',
  uc_first: 'Start with the first loaf. Take the second one away from it.',
  uc_sign: 'Look at the sign again. Is it plus, or take away?',
  uc_tenths: 'A strip is one tenth. A small square is one hundredth. Look again.',
  uc_longer: 'More digits does not mean more. Look at the tenths first.',
  uc_line_up: 'Tenths go with tenths. Hundredths go with hundredths.',
  uc_past_one: 'Ten strips fill a whole tray. That makes one.',
  uc_other: 'Not yet. Let us use the picture to find out.',
  l_mult_1: 'A tray of buns. Three rows of twelve. I split it in a tens part, and a ones part.',
  l_mult_2: 'The tens part is three rows of ten. That is thirty.',
  l_mult_3: 'The ones part is three rows of two. That is six.',
  l_mult_4: 'I add the parts. Thirty and six is thirty-six.',
  l_mult_5: 'Your turn. Four rows of thirteen. The parts are forty, and twelve. How many buns in all?',
  l_mult_6: 'Fifty-two! A big tray is easy in parts.',
  l_div_1: 'Forty-eight buns, and four baskets. Every basket gets the same.',
  l_div_2: 'First I share the trays of ten. Each basket gets one tray. That is ten.',
  l_div_3: 'Then I share the eight loose buns. Each basket gets two more.',
  l_div_4: 'Ten and two is twelve. Forty-eight divided by four is twelve.',
  l_div_5: 'Your turn. Fourteen buns, four baskets. Each basket gets three. How many are left?',
  l_div_6: 'Two are left. Not enough to give every basket one more.',
  l_fadd_1: 'A loaf cut in four slices. One slice here, and two slices there.',
  l_fadd_2: 'The slices are the same size. So I just count them. One and two is three fourths.',
  l_fadd_3: 'Now one half, and one fourth. The slices are not the same size!',
  l_fadd_4: 'I cut the half again. One half is two fourths.',
  l_fadd_5: 'Your turn. Two fourths and one fourth. How many fourths is that?',
  l_fadd_6: 'Three fourths. Same size slices first. Then count.',
  l_dec_1: 'This full tray is one. It has one hundred small squares.',
  l_dec_2: 'A strip is ten squares. Ten strips fill the tray. One strip is one tenth.',
  l_dec_3: 'Three strips is three tenths. We write zero point three.',
  l_dec_4: 'One small square is one hundredth. Four strips and seven squares is zero point four seven.',
  l_dec_5: 'Your turn. Which one is more?',
  l_dec_6: 'Yes. Five strips is more than four strips and five squares.',
} as const;

export type LineKey = keyof typeof LINES;

/** Numbers that have their own clip. Bigger ones are shown, not spoken. */
export const MAX_SPOKEN_NUMBER = 200;

/**
 * Sentences with a number inside are recorded whole, one clip per number, so
 * nothing is stitched mid-sentence: "Your friend has 27 berries." then
 * "Here come 15 more. How many now?"
 */
const BIG_HAS = [125, 134, 136, 152];
const inRange = (n: number, lo: number, hi: number): boolean => Number.isInteger(n) && n >= lo && n <= hi;

export function hasClip(n: number): string | null {
  return inRange(n, 1, 99) || BIG_HAS.includes(n) ? `has_${n}` : null;
}

export function comeClip(n: number): string | null {
  return inRange(n, 1, 99) ? `come_${n}` : null;
}

export function eatsClip(n: number): string | null {
  return inRange(n, 1, 99) ? `eats_${n}` : null;
}

/** Every number a monster can ask for. */
export function targetNumbers(): number[] {
  const all = new Set<number>();
  for (const id of ALL_SPECIES) for (const pool of SPECIES[id].pools) for (const n of pool) all.add(n);
  return [...all].sort((x, y) => x - y);
}

export function makeClip(n: number): string | null {
  return targetNumbers().includes(n) ? `make_${n}` : null;
}

/** The spoken story for a sum, or a plain question when a number has no clip. */
export function addStory(a: number, b: number): Array<string | null> {
  const first = hasClip(a);
  const second = comeClip(b);
  return first && second ? [first, second] : ['how_many_now'];
}

export function subStory(a: number, b: number): Array<string | null> {
  const first = hasClip(a);
  const second = eatsClip(b);
  return first && second ? [first, second] : ['how_many_left'];
}

export function num(n: number): string | null {
  return Number.isInteger(n) && n >= 0 && n <= MAX_SPOKEN_NUMBER ? `n${n}` : null;
}

let renamed: (id: SpeciesId) => boolean = () => false;

/**
 * Tells the voice which monsters she has named herself. There is no recording
 * of a name she typed, so for those the voice leaves the name out: saying the
 * old one would tell her that her name did not count.
 */
export function setRenamedLookup(fn: (id: SpeciesId) => boolean): void {
  renamed = fn;
}

const nameKey = (id: SpeciesId): string => `name_${id}`;
const aboutKey = (id: SpeciesId): string => `about2_${id}`;
const whatKey = (id: SpeciesId): string => `what_${id}`;

/** The monster's name, called out: "Dab!" Nothing for a monster she renamed. */
export function nameClip(id: SpeciesId): string | null {
  return renamed(id) ? null : nameKey(id);
}

/** A sentence or two about the monster. A renamed monster gets the same lines without the name. */
export function aboutClip(id: SpeciesId): string {
  return renamed(id) ? whatKey(id) : aboutKey(id);
}

export function stickerClip(id: string): string {
  return `st_${id}`;
}

/** The spoken name of a fraction, "Three fourths.", when it has a clip. */
export function fracClip(f: Frac): string | null {
  return fracWords(f) ? `f_${f.n}_${f.d}` : null;
}

function lovesText(id: SpeciesId): string {
  const sp = SPECIES[id];
  if (sp.habitat === 'canyon') {
    return { add: 'Loves a big pile of berries.', addR: 'Loves to pack crates.', sub: 'Loves a berry snack.', subR: 'Loves to open crates.' }[sp.delivery ?? 'add'];
  }
  if (sp.habitat === 'early') {
    return { count: 'Loves to count berries.', more: 'Loves the bigger pile.', ten: 'Loves a full crate.', place: 'Loves crates and loose berries.' }[sp.count ?? 'count'];
  }
  if (sp.habitat === 'upper') {
    return { mult: 'Loves big trays.', div: 'Loves fair shares.', fadd: 'Loves slices.', dec: 'Loves crumbs.' }[sp.upper ?? 'mult'];
  }
  return { any: 'Loves all kinds of treats.', add: 'Loves plus treats.', sub: 'Loves minus treats.', mul: 'Loves times treats.', div: 'Loves sharing treats.' }[sp.fav];
}

/** The whole recording script: clip key and the text to speak. */
export function recordingScript(): Array<[string, string]> {
  const out: Array<[string, string]> = Object.entries(LINES);
  for (const id of ALL_SPECIES) {
    const sp = SPECIES[id];
    out.push([nameKey(id), `${sp.name}!`]);
    // The blurbs already say what grass monsters love; say it once.
    const blurb = sp.blurb.includes('Loves') ? sp.blurb : `${sp.blurb} ${lovesText(id)}`;
    const article = /^[aeiou]/i.test(sp.what) ? 'An' : 'A';
    out.push([aboutKey(id), `${sp.name}. ${article} ${sp.what}. ${blurb}`]);
    out.push([whatKey(id), `${article} ${sp.what}. ${blurb}`]);
  }
  for (const st of STICKERS) out.push([stickerClip(st.id), `${st.name}. ${st.how.replace('+, −, × and ÷', 'plus, minus, times, and sharing')}.`]);
  for (let n = 0; n <= MAX_SPOKEN_NUMBER; n++) out.push([`n${n}`, `${capital(spoken(n))}.`]);
  for (const n of [...Array.from({ length: 99 }, (_, i) => i + 1), ...BIG_HAS]) {
    out.push([`has_${n}`, `Your friend has ${spoken(n)} ${n === 1 ? 'berry' : 'berries'}.`]);
  }
  for (let n = 1; n <= 99; n++) {
    out.push([`come_${n}`, n === 1 ? 'Here comes 1 more. How many now?' : `Here come ${n} more. How many now?`]);
    out.push([`eats_${n}`, `Your friend eats ${n}. How many are left?`]);
  }
  for (const n of targetNumbers()) out.push([`make_${n}`, `Can you make ${spoken(n)}?`]);
  for (const d of SPOKEN_BOTTOMS) {
    for (let n = 1; n < d; n++) {
      const words = fracWords({ n, d }) ?? '';
      out.push([`f_${n}_${d}`, `${words.charAt(0).toUpperCase()}${words.slice(1)}.`]);
    }
  }
  out.push(...numberRecordings());
  return out;
}
