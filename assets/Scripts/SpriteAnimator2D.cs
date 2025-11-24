using UnityEngine;

public class SpriteAnimator2D : MonoBehaviour
{
    [SerializeField] private SpriteRenderer spriteRenderer;
    [SerializeField] private float framesPerSecond = 12f;

    private Sprite[] _currentFrames;
    private int _frameIndex;
    private float _timer;

    public void Play(Sprite[] frames)
    {
        _currentFrames = frames;
        _frameIndex = 0;
        _timer = 0f;

        if (_currentFrames != null && _currentFrames.Length > 0)
            spriteRenderer.sprite = _currentFrames[0];
    }

    private void Update()
    {
        if (_currentFrames == null || _currentFrames.Length == 0)
            return;

        _timer += Time.deltaTime;
        float frameDuration = 1f / framesPerSecond;

        if (_timer >= frameDuration)
        {
            _timer -= frameDuration;
            _frameIndex = (_frameIndex + 1) % _currentFrames.Length;
            spriteRenderer.sprite = _currentFrames[_frameIndex];
        }
    }
}
